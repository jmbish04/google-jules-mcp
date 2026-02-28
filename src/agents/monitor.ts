import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { Env } from '../worker';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Jules Monitor Agent
 * Checks on active Jules sessions, assesses progress, and provides interventions
 */
export const julesMonitorAgent = {
  /**
   * Check on a Jules session and provide intervention if needed
   */
  async checkSession(session: any, env: Env, db: any): Promise<void> {
    console.log(`Checking session ${session.id} for task ${session.taskId}`);

    // Get session history
    const prompts = await db.select()
      .from(schema.prompts)
      .where(eq(schema.prompts.sessionId, session.id))
      .orderBy(schema.prompts.createdAt);

    const previousCheckIns = await db.select()
      .from(schema.agentCheckIns)
      .where(eq(schema.agentCheckIns.sessionId, session.id))
      .orderBy(schema.agentCheckIns.createdAt)
      .limit(5);

    // Create AI client via AI Gateway
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/openai`,
    });

    // Construct context for the agent
    const contextPrompt = `
You are monitoring a Jules AI coding session. Your job is to check on progress and help if Jules is stuck.

Session Information:
- Session ID: ${session.id}
- Repository: ${session.repository}
- Branch: ${session.branch}
- Original Task: ${session.originalPrompt}
- Status: ${session.status}
- Created: ${new Date(session.createdAt * 1000).toISOString()}

Prompts sent to Jules:
${prompts.map((p: any, i: number) => `${i + 1}. [${p.promptType}] ${p.prompt}`).join('\n')}

Previous Check-ins (most recent first):
${previousCheckIns.length > 0
  ? previousCheckIns.map((c: any) => `- ${c.agentStatus}: ${c.progressSummary}`).join('\n')
  : 'No previous check-ins'}

Your task:
1. Assess if Jules appears to be making progress or is stuck
2. Determine what status to assign: "still_in_progress", "needs_help", "stuck", or "completed"
3. If stuck or needs help, suggest an intervention (specific message to send to Jules)
4. Provide a brief progress summary

Respond in JSON format:
{
  "status": "still_in_progress" | "needs_help" | "stuck" | "completed",
  "progressSummary": "Brief summary of current progress",
  "interventionNeeded": boolean,
  "suggestedIntervention": "Message to send to Jules (if intervention needed)" or null
}
`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: contextPrompt,
        temperature: 0.3,
      });

      // Parse the response
      const analysis = JSON.parse(text);

      // Log the check-in
      await db.insert(schema.agentCheckIns).values({
        sessionId: session.id,
        agentStatus: analysis.status,
        progressSummary: analysis.progressSummary,
        interventionTaken: analysis.interventionNeeded ? analysis.suggestedIntervention : null,
        julesResponse: null, // Will be filled when Jules responds
      });

      // Update session status if needed
      if (analysis.status === 'stuck' || analysis.status === 'completed') {
        await db.update(schema.julesSessions)
          .set({
            status: analysis.status === 'completed' ? 'pr_submitted' : 'stuck_needs_human_review',
            updatedAt: Math.floor(Date.now() / 1000),
            lastCheckedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(schema.julesSessions.id, session.id));
      } else {
        // Just update lastCheckedAt
        await db.update(schema.julesSessions)
          .set({
            lastCheckedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(schema.julesSessions.id, session.id));
      }

      // If intervention is needed, we could trigger it here
      // (e.g., send message via Jules MCP tool)
      if (analysis.interventionNeeded && analysis.suggestedIntervention) {
        console.log(`Intervention suggested for session ${session.id}: ${analysis.suggestedIntervention}`);
        // TODO: Actually send intervention to Jules
      }

      console.log(`Session ${session.id} check complete. Status: ${analysis.status}`);
    } catch (error) {
      console.error(`Error analyzing session ${session.id}:`, error);

      // Log error check-in
      await db.insert(schema.agentCheckIns).values({
        sessionId: session.id,
        agentStatus: 'error',
        progressSummary: `Error checking session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        interventionTaken: null,
        julesResponse: null,
      });
    }
  }
};
