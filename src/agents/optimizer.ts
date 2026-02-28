import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Env is a global type from worker-configuration.d.ts

/**
 * Prompt Optimizer
 * Optimizes prompts for Jules using Cloudflare documentation context
 * and applies agent rules for standardization
 */
export const promptOptimizer = {
  /**
   * Optimize a prompt for Cloudflare-specific implementation
   */
  async optimizeForCloudflare(prompt: string, env: Env): Promise<string> {
    // Get secrets from secrets store
    const openaiApiKey = await env.OPENAI_API_KEY.get();
    const cloudflareAccountId = await env.CLOUDFLARE_ACCOUNT_ID.get();

    const openai = createOpenAI({
      apiKey: openaiApiKey,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${env.AI_GATEWAY_NAME}/openai`,
    });

    // TODO: Query cloudflare-docs MCP for relevant context
    // For now, use general optimization

    const optimizationPrompt = `
You are optimizing a prompt for Jules (Google's AI coding assistant) to implement on Cloudflare Workers.

Original prompt:
${prompt}

Your task:
1. Add specific Cloudflare Workers best practices
2. Mention relevant Cloudflare services (Workers AI, D1, KV, Durable Objects, etc.) if applicable
3. Include performance and edge computing considerations
4. Keep the core request intact but enhance with technical specifics

Respond with ONLY the optimized prompt, no explanations.
`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: optimizationPrompt,
        temperature: 0.5,
      });

      return text.trim();
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      return prompt; // Fallback to original
    }
  },

  /**
   * Optimize a UX prompt for Stitch with shadcn dark theme standards
   */
  async optimizeForStitch(uxDescription: string, env: Env): Promise<string> {
    // Get secrets from secrets store
    const openaiApiKey = await env.OPENAI_API_KEY.get();
    const cloudflareAccountId = await env.CLOUDFLARE_ACCOUNT_ID.get();

    const openai = createOpenAI({
      apiKey: openaiApiKey,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${env.AI_GATEWAY_NAME}/openai`,
    });

    const optimizationPrompt = `
You are optimizing a UX mockup request for Stitch (Google's UI prototyping tool).

Original request:
${uxDescription}

Your task:
1. Specify that the design should use shadcn/ui components
2. Require a dark theme (bg-background, text-foreground)
3. Include Tailwind CSS classes and modern design patterns
4. Mention accessibility requirements (WCAG AA)
5. Specify responsive design (mobile-first)

Respond with ONLY the optimized Stitch prompt, no explanations.
`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: optimizationPrompt,
        temperature: 0.5,
      });

      return text.trim();
    } catch (error) {
      console.error('Error optimizing Stitch prompt:', error);
      return uxDescription; // Fallback to original
    }
  },

  /**
   * Apply agent rules to a prompt
   */
  async applyAgentRules(prompt: string, ruleType: 'general' | 'ux' | 'cloudflare', db: any): Promise<string> {
    // Get active rules of the specified type
    const rules = await db.select()
      .from(schema.agentRules)
      .where(
        and(
          eq(schema.agentRules.ruleType, ruleType),
          eq(schema.agentRules.isActive, true)
        )
      );

    if (rules.length === 0) {
      return prompt;
    }

    // Append rules context to prompt
    const rulesContext = rules.map((r: any) => `- ${r.ruleName}: ${r.ruleContent}`).join('\n');

    return `${prompt}

Please follow these standards:
${rulesContext}`;
  }
};

// Import schema for type checking
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
