# Quick Start Guide

Get your Jules MCP server running on Cloudflare Workers in 10 minutes.

## Prerequisites

- Cloudflare account (free tier works)
- Node.js 18+
- API keys:
  - OpenAI API key
  - Stitch API key (optional, for UX mockups)

## Step 1: Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

## Step 2: Create D1 Database

```bash
# Login to Cloudflare
npx wrangler login

# Create database
npx wrangler d1 create jules_sessions
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "jules_sessions"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Update this
migrations_dir = "migrations"
```

## Step 3: Set Up AI Gateway

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **AI** → **AI Gateway**
3. Click **Create Gateway**
4. Name it (e.g., `jules-gateway`)
5. Copy your **Account ID** and **Gateway Name**

## Step 4: Configure Secrets

```bash
# Set OpenAI API key
npx wrangler secret put OPENAI_API_KEY
# Paste your key when prompted

# Set Stitch API key (optional)
npx wrangler secret put STITCH_API_KEY
# Paste your key when prompted

# Set AI Gateway config
npx wrangler secret put AI_GATEWAY_ACCOUNT_ID
# Paste your account ID

npx wrangler secret put AI_GATEWAY_NAME
# Paste your gateway name (e.g., jules-gateway)
```

## Step 5: Generate and Apply Migrations

```bash
# Generate migrations from schema
npm run db:generate

# Apply to remote database
npm run migrate:remote
```

## Step 6: Build Frontend

```bash
cd frontend
npm run build
cd ..
```

## Step 7: Deploy

```bash
npm run deploy
```

Your worker will be deployed to: `https://jules-mcp-worker.<your-subdomain>.workers.dev`

## Step 8: Configure MCP Client

Add to your Claude Code config (`~/.config/claude-code/config.json`):

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

## Test It!

1. **Access the UI**: Visit `https://jules-mcp-worker.<your-subdomain>.workers.dev/`
2. **Test MCP**: Use Claude Code to call `jules_create_task`
3. **Check logs**: `npx wrangler tail`

## Example MCP Call

```json
{
  "tool": "jules_create_task",
  "arguments": {
    "description": "Add a REST API endpoint for user authentication",
    "repository": "mycompany/backend",
    "branch": "main",
    "optimize": true
  }
}
```

## Local Development

For local testing:

```bash
# Copy environment template
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your API keys
nano .dev.vars

# Apply migrations locally
npm run migrate:local

# Start local worker
npm run dev:worker

# Access locally at http://localhost:8787
```

## Verify Cron Job

```bash
# Start dev server with cron testing
npx wrangler dev --test-scheduled

# In another terminal, trigger cron manually
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=*+*+*+*+*"
```

## Common Issues

### Database ID not found
- Make sure you updated `wrangler.toml` with the correct `database_id`
- Run `npx wrangler d1 list` to see your databases

### Secrets not set
- Run `npx wrangler secret list` to see which secrets are set
- Re-run `npx wrangler secret put SECRET_NAME` to update

### Migration failed
- Check migration files in `migrations/`
- Try: `npx wrangler d1 migrations list jules_sessions --remote`
- Reset if needed: Delete and recreate database (development only!)

### Frontend not building
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. Configure agent rules in `.agents/rules/`
2. Add custom rules via UI at `/rules`
3. Monitor sessions at `/`
4. Check AI Gateway analytics in Cloudflare Dashboard
5. View D1 data: `npm run db:studio`

## Need Help?

- [Full Deployment Guide](./CLOUDFLARE_DEPLOYMENT.md)
- [Implementation Details](./IMPLEMENTATION_SUMMARY.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)

## Cost Estimate

On Cloudflare's **Free Plan**:
- Workers: 100,000 requests/day (free)
- D1: 5 GB storage, 5M reads/day (free)
- AI Gateway: Unlimited requests (free)
- Workers AI: 10,000 neurons/day (free)

For most use cases, this runs completely free! 🎉

Paid plans start at $5/month for higher limits.
