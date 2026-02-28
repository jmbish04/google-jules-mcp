import { createMcpHandler } from 'agents/mcp';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import { julesMonitorAgent } from './agents/monitor';
import { promptOptimizer } from './agents/optimizer';

export interface Env {
  DB: D1Database;
  AI: any;
  ASSETS: Fetcher;
  STITCH_API_KEY: string;
  OPENAI_API_KEY: string;
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_NAME: string;
}

// MCP Handler for Jules
const mcpHandler = createMcpHandler({
  name: 'jules-mcp-cloudflare',
  version: '1.0.0',

  tools: {
    // Create a new Jules task with session tracking
    jules_create_task: {
      description: 'Create a new Jules task with repository and description. Session is tracked in D1.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Task description or prompt for Jules'
          },
          repository: {
            type: 'string',
            description: 'Repository in format owner/repo'
          },
          branch: {
            type: 'string',
            description: 'Branch name (optional)',
            default: 'main'
          },
          optimize: {
            type: 'boolean',
            description: 'Whether to optimize the prompt with Cloudflare docs context',
            default: true
          }
        },
        required: ['description', 'repository']
      },
      handler: async (params: any, { db, env }: any) => {
        let finalPrompt = params.description;

        // Optimize prompt if requested
        if (params.optimize) {
          finalPrompt = await promptOptimizer.optimizeForCloudflare(
            params.description,
            env
          );
        }

        // Create session in D1
        const sessionId = crypto.randomUUID();
        await db.insert(schema.julesSessions).values({
          id: sessionId,
          taskId: '', // Will be filled after Jules creates task
          repository: params.repository,
          branch: params.branch || 'main',
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
          sessionId,
          originalPrompt: params.description,
          optimizedPrompt: finalPrompt,
          message: 'Session created. Jules task will be initiated with optimized prompt.'
        };
      }
    },

    // Send message to Jules with tracking
    jules_send_message: {
      description: 'Send a message or instruction to Jules in an active task',
      parameters: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID from jules_create_task'
          },
          message: {
            type: 'string',
            description: 'Message to send to Jules'
          },
          optimize: {
            type: 'boolean',
            description: 'Whether to optimize the message',
            default: true
          }
        },
        required: ['sessionId', 'message']
      },
      handler: async (params: any, { db, env }: any) => {
        let finalMessage = params.message;

        if (params.optimize) {
          finalMessage = await promptOptimizer.optimizeForCloudflare(
            params.message,
            env
          );
        }

        // Log the prompt
        await db.insert(schema.prompts).values({
          sessionId: params.sessionId,
          prompt: params.message,
          optimizedPrompt: finalMessage,
          promptType: 'follow_up',
        });

        return {
          originalMessage: params.message,
          optimizedMessage: finalMessage,
          message: 'Message will be sent to Jules'
        };
      }
    },

    // Request UX mockup via Stitch
    jules_request_ux_mockup: {
      description: 'Request a UX mockup from Stitch for Jules to implement',
      parameters: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID for this Jules task'
          },
          uxDescription: {
            type: 'string',
            description: 'Description of the UX/UI to mockup'
          }
        },
        required: ['sessionId', 'uxDescription']
      },
      handler: async (params: any, { db, env }: any) => {
        // Optimize for Stitch with shadcn dark theme standards
        const optimizedPrompt = await promptOptimizer.optimizeForStitch(
          params.uxDescription,
          env
        );

        // TODO: Actually call Stitch MCP here
        const stitchSessionId = `stitch-${crypto.randomUUID()}`;

        // Log UX mockup request
        await db.insert(schema.uxMockups).values({
          sessionId: params.sessionId,
          stitchSessionId,
          mockupPrompt: params.uxDescription,
          optimizedPrompt,
        });

        return {
          stitchSessionId,
          optimizedPrompt,
          message: 'Stitch mockup requested. Session ID can be provided to Jules.'
        };
      }
    },

    // List active sessions
    jules_list_sessions: {
      description: 'List all Jules sessions with their current status',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status',
            enum: ['active', 'stuck_needs_human_review', 'pr_submitted', 'completed', 'failed']
          }
        }
      },
      handler: async (params: any, { db }: any) => {
        let query = db.select().from(schema.julesSessions);

        if (params.status) {
          query = query.where(eq(schema.julesSessions.status, params.status));
        }

        const sessions = await query.limit(50);

        return {
          sessions,
          count: sessions.length
        };
      }
    },

    // Get session details
    jules_get_session: {
      description: 'Get detailed information about a Jules session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID'
          }
        },
        required: ['sessionId']
      },
      handler: async (params: any, { db }: any) => {
        const session = await db.select()
          .from(schema.julesSessions)
          .where(eq(schema.julesSessions.id, params.sessionId))
          .limit(1);

        if (session.length === 0) {
          throw new Error('Session not found');
        }

        // Get related data
        const promptsData = await db.select()
          .from(schema.prompts)
          .where(eq(schema.prompts.sessionId, params.sessionId));

        const checkIns = await db.select()
          .from(schema.agentCheckIns)
          .where(eq(schema.agentCheckIns.sessionId, params.sessionId))
          .orderBy(desc(schema.agentCheckIns.createdAt));

        return {
          session: session[0],
          prompts: promptsData,
          checkIns
        };
      }
    }
  }
});

// Main worker export
export default {
  // Handle HTTP requests (MCP protocol + frontend)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const db = drizzle(env.DB, { schema });

    // MCP endpoint
    if (url.pathname === '/mcp') {
      return mcpHandler(request, { db, env });
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
      const body = await request.json();

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

// Import eq and desc from drizzle-orm
import { eq, desc } from 'drizzle-orm';
