# Jules MCP on Cloudflare Workers

This is a comprehensive implementation of the Jules MCP server hosted on Cloudflare Workers with D1 database, AI agents, and a management UI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MCP Handler  │  │ Cron Monitor │  │ Frontend UI  │     │
│  │ /mcp         │  │ (Hourly)     │  │ /            │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │  D1 Database │                         │
│                    │  - Sessions  │                         │
│                    │  - Prompts   │                         │
│                    │  - Check-ins │                         │
│                    │  - Rules     │                         │
│                    └─────────────┘                          │
│                                                              │
│         ┌──────────────────────────────────────┐           │
│         │  Cloudflare Agents SDK                │           │
│         │  - OpenAI via AI Gateway              │           │
│         │  - Workers AI                         │           │
│         │  - MCP Tools (docs, stitch)           │           │
│         └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🚀 MCP Server on Workers
- **Remote MCP protocol** via `/mcp` endpoint
- **Session tracking** in D1 database
- **Prompt optimization** using Cloudflare docs and agent rules
- **UX mockup integration** with Stitch MCP

### 🤖 AI Agent Monitoring
- **Hourly cron job** checks on active Jules sessions
- **Progress assessment** using Workers AI via AI Gateway
- **Automatic interventions** when Jules gets stuck
- **Status tracking**: active, stuck_needs_human_review, pr_submitted, completed

### 💾 D1 Database with Drizzle
- **Type-safe ORM** with Drizzle
- **Migration system** for schema management
- **Session logging**: tracks all Jules tasks
- **Prompt optimization**: stores original and optimized prompts
- **Agent check-ins**: records all monitoring activities

### 🎨 Astro Frontend
- **Dark theme** with shadcn design system
- **Session management**: view all Jules sessions
- **Agent rules configuration**: customize prompt optimization
- **Real-time updates**: auto-refresh session status

### 📋 Agent Rules System
- **General rules**: code quality, testing, security
- **UX rules**: shadcn components, accessibility, responsive design
- **Cloudflare rules**: Workers best practices, D1 optimization

## Setup & Deployment

### Prerequisites
- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Node.js 18+

### 1. Create D1 Database

```bash
# Create the database
wrangler d1 create jules_sessions

# Update wrangler.toml with the database_id returned
```

### 2. Configure Secrets

```bash
# Set required secrets
wrangler secret put STITCH_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put AI_GATEWAY_ACCOUNT_ID
wrangler secret put AI_GATEWAY_NAME
```

### 3. Generate and Apply Migrations

```bash
# Generate migrations from schema
npm run db:generate

# Apply migrations to local D1
npm run migrate:local

# Apply migrations to remote D1 (production)
npm run migrate:remote
```

### 4. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Deploy

```bash
# Deploy worker with migrations
npm run deploy

# Or deploy and tail logs
npm run deploy:tail
```

## Usage

### MCP Client Configuration

Add to your Claude Code config:

```json
{
  "mcpServers": {
    "jules-cloudflare": {
      "url": "https://jules-mcp-worker.<your-subdomain>.workers.dev/mcp",
      "type": "http"
    }
  }
}
```

### MCP Tools

#### `jules_create_task`
Create a new Jules task with automatic prompt optimization.

```typescript
{
  "description": "Add a new API endpoint for user management",
  "repository": "mycompany/backend",
  "branch": "main",
  "optimize": true
}
```

#### `jules_send_message`
Send a message to an active Jules session.

```typescript
{
  "sessionId": "uuid",
  "message": "Please also add rate limiting to this endpoint",
  "optimize": true
}
```

#### `jules_request_ux_mockup`
Request a UX mockup from Stitch.

```typescript
{
  "sessionId": "uuid",
  "uxDescription": "Dashboard with user statistics and charts"
}
```

#### `jules_list_sessions`
List all Jules sessions.

```typescript
{
  "status": "active"  // optional filter
}
```

#### `jules_get_session`
Get detailed session information.

```typescript
{
  "sessionId": "uuid"
}
```

## Cron Monitoring

The worker runs an hourly cron job that:

1. **Queries D1** for active Jules sessions
2. **Analyzes progress** using AI agent
3. **Determines status**: still_in_progress, needs_help, stuck, completed
4. **Intervenes if needed**: sends helpful messages to Jules
5. **Updates session status** in D1
6. **Logs check-in** for tracking

If no active sessions are found, the worker notes that it can spin down.

## Frontend UI

Access the management UI at: `https://jules-mcp-worker.<your-subdomain>.workers.dev/`

Features:
- **Session List**: View all Jules sessions with status
- **Session Details**: See prompts, check-ins, and progress
- **Agent Rules**: Configure optimization rules
- **Real-time Updates**: Auto-refresh every 30 seconds

## Prompt Optimization

### Cloudflare Context
When creating tasks, prompts are enhanced with:
- Cloudflare Workers best practices
- Relevant service mentions (D1, KV, Durable Objects)
- Edge computing considerations
- Performance optimization tips

### UX Standardization
UX mockup requests include:
- shadcn/ui component specifications
- Dark theme color palette
- Accessibility requirements (WCAG AA)
- Responsive design directives
- Tailwind CSS patterns

## Agent Rules

Rules are stored in `.agents/rules/` and can be managed via:
1. **File system**: Edit markdown files directly
2. **Frontend UI**: Add/edit rules via the web interface
3. **D1 database**: Rules are synced to database for runtime use

## Development

### Local Development

```bash
# Run worker locally
npm run dev:worker

# Run database migrations locally
npm run migrate:local

# View database with Drizzle Studio
npm run db:studio
```

### Database Schema Updates

1. Modify `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply locally: `npm run migrate:local`
4. Test changes
5. Apply to production: `npm run migrate:remote`

## Environment Variables

Set in `wrangler.toml`:
- `ENVIRONMENT`: production/development

Set as secrets:
- `STITCH_API_KEY`: Stitch API key
- `OPENAI_API_KEY`: OpenAI API key for agents
- `AI_GATEWAY_ACCOUNT_ID`: Cloudflare account ID
- `AI_GATEWAY_NAME`: AI Gateway name

## Troubleshooting

### D1 Migration Issues
```bash
# List migrations
wrangler d1 migrations list jules_sessions --remote

# Check local database
npm run db:studio
```

### Worker Deployment Issues
```bash
# Check logs
wrangler tail

# Deploy with verbose output
wrangler deploy --verbose
```

### Cron Not Running
- Verify cron trigger in wrangler.toml
- Check worker logs during scheduled time
- Ensure worker is deployed (not just in dev mode)

## License

MIT
