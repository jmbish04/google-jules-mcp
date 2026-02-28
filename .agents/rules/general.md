# General Agent Rules

These rules apply to all prompts sent through the Jules MCP server.

## Code Quality
- Always follow the existing code style and patterns in the repository
- Write clean, maintainable, and well-documented code
- Include error handling and edge case considerations
- Add TypeScript types for type safety

## Testing
- Write tests for new functionality when appropriate
- Ensure existing tests pass before marking work complete
- Use the project's existing testing framework

## Performance
- Consider performance implications of implementations
- Optimize for edge computing when deploying to Cloudflare Workers
- Use async/await patterns appropriately

## Security
- Never commit secrets or API keys
- Validate and sanitize user input
- Follow security best practices for the platform
