# Cloudflare-Specific Agent Rules

These rules apply when implementing features for Cloudflare Workers/Pages.

## Workers Best Practices
- Keep Workers lightweight (< 1MB after compression)
- Use streaming responses for large payloads
- Implement proper error handling with try/catch
- Use Workers KV for caching, D1 for relational data
- Leverage Durable Objects for stateful operations

## Performance Optimization
- Use edge caching with Cache API
- Minimize cold start time
- Use `waitUntil()` for non-blocking operations
- Batch D1 queries when possible

## D1 Database
- Use Drizzle ORM for type safety
- Implement proper indexes for query performance
- Use prepared statements to prevent SQL injection
- Keep transactions short and focused

## Workers AI Integration
- Route requests through AI Gateway for caching and analytics
- Handle streaming responses properly
- Implement fallback strategies for AI failures
- Cache AI responses when appropriate

## Binding Usage
- Use environment bindings (env.DB, env.AI, env.KV)
- Never hardcode configuration values
- Use Secrets for sensitive data (env.API_KEY)
- Type environment bindings properly in TypeScript

## Routing and Handling
- Use Hono or native fetch handlers
- Implement CORS properly for API endpoints
- Return proper HTTP status codes
- Include security headers (CSP, X-Frame-Options, etc.)

## Cron Triggers
- Keep scheduled handlers idempotent
- Use `waitUntil()` for async operations
- Implement proper error handling and logging
- Consider time zones (cron runs in UTC)

## Assets and Static Files
- Use Workers Sites or Pages for static assets
- Implement proper cache headers
- Optimize images and assets for edge delivery
- Use versioning for cache busting
