import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod/v3';
import * as schema from './db/schema';
import { julesMonitorAgent } from './agents/monitor';
import { promptOptimizer } from './agents/optimizer';
import { eq, desc } from 'drizzle-orm';
import { createMcpHandler } from './mcp/handler';

// Main worker export
export default {
  // Handle HTTP requests (MCP protocol + frontend)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const db = drizzle(env.DB, { schema });

    // MCP endpoint
    if (url.pathname === '/mcp') {
      const server = new McpServer({
        name: 'jules-mcp-cloudflare',
        version: '1.0.0',
      });

      // Create a new Jules task with session tracking
      server.tool(
        'jules_create_task',
        'Create a new Jules task with repository and description. Session is tracked in D1.',
        {
          description: z.string().describe('Task description or prompt for Jules'),
          repository: z.string().describe('Repository in format owner/repo'),
          branch: z.string().default('main').describe('Branch name (optional)'),
          optimize: z.boolean().default(true).describe('Whether to optimize the prompt with Cloudflare docs context')
        },
        async (params) => {
          let finalPrompt = params.description;

          // Optimize prompt if requested
          if (params.optimize) {
            finalPrompt = await promptOptimizer.optimizeForCloudflare(params.description, env);
          }

          // Create session in D1
          const sessionId = crypto.randomUUID();
          await db.insert(schema.julesSessions).values({
            id: sessionId,
            taskId: '', // Will be filled after Jules creates task
            repository: params.repository,
            branch: params.branch,
            status: 'active',
            originalPrompt: params.description,
          });

          // Log the prompt
          await db.insert(schema.prompts).values({
            sessionId,
            prompt: params.description,
            optimizedPrompt: finalPrompt,
            promptType: 'initial',
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                sessionId,
                originalPrompt: params.description,
                optimizedPrompt: finalPrompt,
                message: 'Session created. Jules task will be initiated with optimized prompt.'
              }, null, 2)
            }]
          };
        }
      );

      // Send message to Jules with tracking
      server.tool(
        'jules_send_message',
        'Send a message or instruction to Jules in an active task',
        {
          sessionId: z.string().describe('Session ID from jules_create_task'),
          message: z.string().describe('Message to send to Jules'),
          optimize: z.boolean().default(true).describe('Whether to optimize the message')
        },
        async (params) => {
          let finalMessage = params.message;

          if (params.optimize) {
            finalMessage = await promptOptimizer.optimizeForCloudflare(params.message, env);
          }

          // Log the prompt
          await db.insert(schema.prompts).values({
            sessionId: params.sessionId,
            prompt: params.message,
            optimizedPrompt: finalMessage,
            promptType: 'follow_up',
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                originalMessage: params.message,
                optimizedMessage: finalMessage,
                message: 'Message will be sent to Jules'
              }, null, 2)
            }]
          };
        }
      );

      // Request UX mockup via Stitch
      server.tool(
        'jules_request_ux_mockup',
        'Request a UX mockup from Stitch for Jules to implement',
        {
          sessionId: z.string().describe('Session ID for this Jules task'),
          uxDescription: z.string().describe('Description of the UX/UI to mockup')
        },
        async (params) => {
          const optimizedPrompt = await promptOptimizer.optimizeForStitch(params.uxDescription, env);
          const stitchSessionId = `stitch-${crypto.randomUUID()}`;

          // Log UX mockup request
          await db.insert(schema.uxMockups).values({
            sessionId: params.sessionId,
            stitchSessionId,
            mockupPrompt: params.uxDescription,
            optimizedPrompt,
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                stitchSessionId,
                optimizedPrompt,
                message: 'Stitch mockup requested. Session ID can be provided to Jules.'
              }, null, 2)
            }]
          };
        }
      );

      // List active sessions
      server.tool(
        'jules_list_sessions',
        'List all Jules sessions with their current status',
        {
          status: z.enum(['active', 'stuck_needs_human_review', 'pr_submitted', 'completed', 'failed'])
            .optional()
            .describe('Filter by status')
        },
        async (params) => {
          const baseQuery = db.select().from(schema.julesSessions);

          if (params.status) {
            const sessions = await baseQuery.where(eq(schema.julesSessions.status, params.status)).limit(50);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  sessions,
                  count: sessions.length
                }, null, 2)
              }]
            };
          }

          const sessions = await baseQuery.limit(50);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                sessions,
                count: sessions.length
              }, null, 2)
            }]
          };
        }
      );

      // Get session details
      server.tool(
        'jules_get_session',
        'Get detailed information about a Jules session',
        {
          sessionId: z.string().describe('Session ID')
        },
        async (params) => {
          const session = await db.select()
            .from(schema.julesSessions)
            .where(eq(schema.julesSessions.id, params.sessionId))
            .limit(1);

          if (session.length === 0) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: 'Session not found' }) }],
              isError: true
            };
          }

          const promptsData = await db.select()
            .from(schema.prompts)
            .where(eq(schema.prompts.sessionId, params.sessionId));

          const checkIns = await db.select()
            .from(schema.agentCheckIns)
            .where(eq(schema.agentCheckIns.sessionId, params.sessionId))
            .orderBy(desc(schema.agentCheckIns.createdAt));

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                session: session[0],
                prompts: promptsData,
                checkIns
              }, null, 2)
            }]
          };
        }
      );

      const mcpHandler = createMcpHandler(server);
      return mcpHandler(request, env, ctx); // Passed standard Worker Fetch args
    }

    // Frontend assets
    if (url.pathname.startsWith('/') && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // API endpoint for frontend
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, db);
    }

    return new Response('Not found', { status: 404 });
  },

  // Cron trigger - runs hourly
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = drizzle(env.DB, { schema });

    console.log('Running hourly Jules session check...');

    // Query for active sessions
    const activeSessions = await db.select()
      .from(schema.julesSessions)
      .where(eq(schema.julesSessions.status, 'active'));

    if (activeSessions.length === 0) {
      console.log('No active sessions found. Worker can spin down.');
      return;
    }

    console.log(`Found ${activeSessions.length} active sessions. Starting agent checks...`);

    // Check in on each active session
    for (const session of activeSessions) {
      try {
        await julesMonitorAgent.checkSession(session, env, db);
      } catch (error) {
        console.error(`Error checking session ${session.id}:`, error);
      }
    }
  }
};

// Helper function to handle API requests
async function handleApiRequest(request: Request, env: Env, db: any): Promise<Response> {
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/sessions - list sessions
    if (url.pathname === '/api/sessions' && request.method === 'GET') {
      const sessions = await db.select()
        .from(schema.julesSessions)
        .orderBy(desc(schema.julesSessions.updatedAt))
        .limit(100);

      return Response.json({ sessions }, { headers: corsHeaders });
    }

    // GET /api/sessions/:id - get session details
    if (url.pathname.match(/^\/api\/sessions\/[^\/]+$/) && request.method === 'GET') {
      const sessionId = url.pathname.split('/').pop();

      if (!sessionId) {
        return Response.json({ error: 'Invalid session ID' }, { status: 400, headers: corsHeaders });
      }

      const session = await db.select()
        .from(schema.julesSessions)
        .where(eq(schema.julesSessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        return Response.json({ error: 'Session not found' }, { status: 404, headers: corsHeaders });
      }

      const prompts = await db.select()
        .from(schema.prompts)
        .where(eq(schema.prompts.sessionId, sessionId));

      const checkIns = await db.select()
        .from(schema.agentCheckIns)
        .where(eq(schema.agentCheckIns.sessionId, sessionId))
        .orderBy(desc(schema.agentCheckIns.createdAt));

      return Response.json({
        session: session[0],
        prompts,
        checkIns
      }, { headers: corsHeaders });
    }

    // GET /api/rules - get agent rules
    if (url.pathname === '/api/rules' && request.method === 'GET') {
      const rules = await db.select()
        .from(schema.agentRules)
        .where(eq(schema.agentRules.isActive, true));

      return Response.json({ rules }, { headers: corsHeaders });
    }

    // POST /api/rules - create agent rule
    if (url.pathname === '/api/rules' && request.method === 'POST') {
      const body = await request.json() as any;

      const result = await db.insert(schema.agentRules).values({
        ruleType: body.ruleType,
        ruleName: body.ruleName,
        ruleContent: body.ruleContent,
        isActive: true,
      }).returning();

      return Response.json({ rule: result[0] }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
