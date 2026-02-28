import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Jules sessions table
export const julesSessions = sqliteTable('jules_sessions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  repository: text('repository').notNull(),
  branch: text('branch').notNull(),
  status: text('status').notNull(), // 'active', 'stuck_needs_human_review', 'pr_submitted', 'completed', 'failed'
  originalPrompt: text('original_prompt').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Prompts sent to Jules
export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => julesSessions.id),
  prompt: text('prompt').notNull(),
  optimizedPrompt: text('optimized_prompt'),
  promptType: text('prompt_type').notNull(), // 'initial', 'follow_up', 'ux_request', 'agent_intervention'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Agent check-ins and interventions
export const agentCheckIns = sqliteTable('agent_check_ins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => julesSessions.id),
  agentStatus: text('agent_status').notNull(), // 'still_in_progress', 'needs_help', 'stuck', 'completed'
  progressSummary: text('progress_summary'),
  interventionTaken: text('intervention_taken'),
  julesResponse: text('jules_response'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// UX mockup sessions (from Stitch)
export const uxMockups = sqliteTable('ux_mockups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => julesSessions.id),
  stitchSessionId: text('stitch_session_id').notNull(),
  mockupPrompt: text('mockup_prompt').notNull(),
  optimizedPrompt: text('optimized_prompt'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Agent rules configuration
export const agentRules = sqliteTable('agent_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ruleType: text('rule_type').notNull(), // 'general', 'ux', 'cloudflare'
  ruleName: text('rule_name').notNull(),
  ruleContent: text('rule_content').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type JulesSession = typeof julesSessions.$inferSelect;
export type NewJulesSession = typeof julesSessions.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type AgentCheckIn = typeof agentCheckIns.$inferSelect;
export type NewAgentCheckIn = typeof agentCheckIns.$inferInsert;
export type UxMockup = typeof uxMockups.$inferSelect;
export type NewUxMockup = typeof uxMockups.$inferInsert;
export type AgentRule = typeof agentRules.$inferSelect;
export type NewAgentRule = typeof agentRules.$inferInsert;
