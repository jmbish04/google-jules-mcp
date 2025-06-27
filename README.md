# Google Jules MCP

A Model Context Protocol (MCP) server for automating Google Jules - the AI coding assistant. This MCP enables seamless integration with Jules for task creation, code review automation, repository management, and AI-powered development workflows.

## Features

### 🎯 **Task Management**
- **Create Tasks**: Automatically create Jules tasks with repository and description
- **Monitor Progress**: Track task status and get real-time updates
- **Approve Plans**: Review and approve Jules execution plans
- **Resume Tasks**: Resume paused or interrupted tasks
- **Bulk Operations**: Create multiple tasks efficiently

### 🔧 **Code Operations**
- **Code Analysis**: Analyze code changes and diffs
- **Branch Management**: Handle repository branches and configurations
- **Source Navigation**: Browse and analyze source files
- **Review Automation**: Automate code review workflows

### 💬 **Interactive Communication**
- **Send Messages**: Send instructions and feedback to Jules
- **Chat History**: Track conversation history with Jules
- **Context Extraction**: Extract relevant context from task discussions

### 📊 **Project Management**
- **Task Listing**: List and filter tasks by status
- **Progress Tracking**: Monitor development progress across projects
- **Data Persistence**: Local storage of task data and history

### 🔐 **Session Management** (NEW!)
- **Multiple Session Modes**: Fresh, Chrome profile, cookies, persistent, and Browserbase
- **Google Authentication**: Seamless login with existing Google sessions
- **Cookie Management**: Extract, save, and restore authentication cookies
- **Remote Browser Support**: Use Browserbase for cloud deployments
- **Cross-Platform**: Works locally and in cloud environments

## Available Tools

| Tool | Description |
|------|-------------|
| **Task Management** ||
| `jules_create_task` | Create a new Jules task with repository and description |
| `jules_get_task` | Get detailed information about a specific task |
| `jules_send_message` | Send messages/instructions to Jules in active tasks |
| `jules_approve_plan` | Approve Jules execution plans |
| `jules_resume_task` | Resume paused tasks |
| `jules_list_tasks` | List tasks with filtering options |
| `jules_analyze_code` | Analyze code changes and project structure |
| `jules_bulk_create_tasks` | Create multiple tasks from a list |
| **Session & Authentication** ||
| `jules_get_cookies` | Get current browser cookies for session persistence |
| `jules_set_cookies` | Set browser cookies from string/JSON for authentication |
| `jules_session_info` | Get current session configuration and status |
| **Debugging** ||
| `jules_screenshot` | Take debugging screenshots |

## Installation

### Prerequisites
- Node.js 18+ 
- TypeScript
- Git access to repositories you want to manage

### Setup

```bash
# Clone the repository
git clone https://github.com/samihalawa/google-jules-mcp.git
cd google-jules-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test the installation
npm test
```

## 🔐 Session Management & Authentication

### Session Modes

The MCP supports 5 different session management modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `fresh` | New browser session each time | Testing, no authentication needed |
| `chrome-profile` | Use existing Chrome profile | Local development with existing Google login |
| `cookies` | Save/load cookies to file | Persistent authentication without full profile |
| `persistent` | Save browser data to directory | Local development with full session persistence |
| `browserbase` | Remote browser session | Cloud deployments, Smithery hosting |

### Configuration Options

#### 🌐 **Browserbase (Recommended for Smithery)**

Perfect for remote deployments and cloud hosting:

```bash
SESSION_MODE=browserbase
BROWSERBASE_API_KEY=bb_live_g3i-b4WPFh__E3cErKE5rO-jWds  # Your API key
BROWSERBASE_PROJECT_ID=d718e85f-be7b-497d-9123-b1bbf798f1bb  # Your project ID
BROWSERBASE_SESSION_ID=                    # Optional: use existing session
```

#### 🍪 **Cookie Authentication (Best for Manual Setup)**

Extract cookies from your browser and set them as environment variable:

```bash
SESSION_MODE=cookies
GOOGLE_AUTH_COOKIES="session_id=abc123; domain=.google.com; auth_token=xyz789; domain=.google.com"
COOKIES_PATH=~/.jules-mcp/cookies.json     # File to save/load cookies
```

#### 🌍 **Chrome Profile (Local Development)**

Use your existing Chrome profile:

```bash
SESSION_MODE=chrome-profile
CHROME_USER_DATA_DIR=/Users/yourname/Library/Application Support/Google/Chrome/Default
```

#### 💾 **Persistent Browser Data**

Save browser data to a specific directory:

```bash
SESSION_MODE=persistent
CHROME_USER_DATA_DIR=~/.jules-mcp/browser-data  # Custom browser data directory
```

### How to Get Google Authentication Cookies

1. **Log in to Jules**: Visit https://jules.google.com and log in
2. **Open Developer Tools**: Press F12 or Cmd+Option+I
3. **Go to Application/Storage tab**
4. **Find Cookies**: Look for `.google.com` cookies
5. **Copy Important Cookies**: Look for cookies like:
   - `session_id` or `sessionid`
   - `auth_token` or `authuser`
   - `SID`, `HSID`, `SSID`
   - `SAPISID`, `APISID`

**Format for environment variable:**
```bash
GOOGLE_AUTH_COOKIES="cookie1=value1; domain=.google.com; cookie2=value2; domain=.google.com"
```

### Environment Configuration

Create a `.env` file or set environment variables:

```bash
# Browser Configuration
HEADLESS=true              # Run browser in headless mode
TIMEOUT=30000              # Browser timeout in milliseconds
DEBUG=false                # Enable debug mode with screenshots

# Session Management
SESSION_MODE=browserbase   # fresh | chrome-profile | cookies | persistent | browserbase

# Browserbase Configuration (for remote/cloud deployments)
BROWSERBASE_API_KEY=your_api_key
BROWSERBASE_PROJECT_ID=your_project_id
BROWSERBASE_SESSION_ID=optional_existing_session

# Cookie Authentication
GOOGLE_AUTH_COOKIES="session_id=abc; domain=.google.com"
COOKIES_PATH=~/.jules-mcp/cookies.json

# Chrome Profile (local development)
CHROME_USER_DATA_DIR=/path/to/chrome/profile

# Data Storage
JULES_DATA_PATH=~/.jules-mcp/data.json  # Custom data storage path
```

## Usage Examples

### 1. Create a New Task

```javascript
// Create a task to fix a bug
{
  "name": "jules_create_task",
  "arguments": {
    "description": "Fix the login authentication bug in the user dashboard. The issue occurs when users try to log in with special characters in their password.",
    "repository": "mycompany/webapp",
    "branch": "main"
  }
}
```

### 2. Monitor Task Progress

```javascript
// Get task details and progress
{
  "name": "jules_get_task",
  "arguments": {
    "taskId": "9103172019911831130"
  }
}
```

### 3. Send Instructions to Jules

```javascript
// Send additional context or instructions
{
  "name": "jules_send_message",
  "arguments": {
    "taskId": "9103172019911831130",
    "message": "Please also add unit tests for the authentication fix and ensure backward compatibility."
  }
}
```

### 4. Bulk Task Creation

```javascript
// Create multiple tasks at once
{
  "name": "jules_bulk_create_tasks",
  "arguments": {
    "tasks": [
      {
        "description": "Add dark mode support to the UI",
        "repository": "mycompany/frontend",
        "branch": "feature/dark-mode"
      },
      {
        "description": "Optimize database queries for user search",
        "repository": "mycompany/backend",
        "branch": "performance/search"
      }
    ]
  }
}
```

### 5. List and Filter Tasks

```javascript
// List active tasks
{
  "name": "jules_list_tasks",
  "arguments": {
    "status": "in_progress",
    "limit": 10
  }
}
```

### 6. Session Management Examples

#### Check Session Status
```javascript
{
  "name": "jules_session_info",
  "arguments": {}
}
```

#### Get Current Cookies (for backup)
```javascript
{
  "name": "jules_get_cookies",
  "arguments": {
    "format": "string"  // or "json"
  }
}
```

#### Set Authentication Cookies
```javascript
{
  "name": "jules_set_cookies",
  "arguments": {
    "cookies": "session_id=abc123; domain=.google.com; auth_token=xyz789; domain=.google.com",
    "format": "string"
  }
}
```

## MCP Resources

The server provides useful resources for context:

- `jules://schemas/task` - Complete task data model
- `jules://current/active-tasks` - Live list of active tasks
- `jules://templates/common-tasks` - Template examples for common development tasks

## Common Task Templates

The MCP includes templates for common development scenarios:

- **Bug Fix**: `"Fix the [specific issue] in [filename]. The problem is [description]."`
- **Feature Add**: `"Add [feature name] functionality to [location]. Requirements: [list requirements]."`
- **Refactor**: `"Refactor [component/function] to improve [performance/readability/maintainability]."`
- **Testing**: `"Add comprehensive tests for [component/function] covering [test cases]."`
- **Documentation**: `"Update documentation for [component] to include [new features/changes]."`

## Integration with Claude Code

### Local Integration

```json
{
  "mcpServers": {
    "google-jules-mcp": {
      "command": "node",
      "args": ["path/to/google-jules-mcp/dist/index.js"],
      "env": {
        "HEADLESS": "true",
        "SESSION_MODE": "cookies",
        "GOOGLE_AUTH_COOKIES": "your_cookies_here",
        "DEBUG": "false"
      }
    }
  }
}
```

## 🌐 Smithery Deployment

### Deploy to Smithery.ai

The MCP is fully configured for Smithery deployment with comprehensive session management:

1. **Fork/Clone** this repository
2. **Deploy to Smithery**: Visit [smithery.ai](https://smithery.ai) and connect your repo
3. **Configure Session Management** in Smithery settings:

#### Option A: Browserbase (Recommended)
```bash
SESSION_MODE=browserbase
BROWSERBASE_API_KEY=bb_live_g3i-b4WPFh__E3cErKE5rO-jWds
BROWSERBASE_PROJECT_ID=d718e85f-be7b-497d-9123-b1bbf798f1bb
```

#### Option B: Cookie Authentication
```bash
SESSION_MODE=cookies
GOOGLE_AUTH_COOKIES="session_id=abc123; domain=.google.com; auth_token=xyz789; domain=.google.com"
```

4. **Access Remotely**: Use your deployed MCP from any Claude Code instance

### Benefits of Smithery + Browserbase

- ✅ **No Local Browser**: Runs entirely in the cloud
- ✅ **Persistent Sessions**: Maintain Google authentication across deployments
- ✅ **Global Access**: Use from anywhere with internet connection
- ✅ **Auto-scaling**: Handles multiple concurrent requests
- ✅ **Zero Setup**: No local dependencies or configuration needed

## Troubleshooting

### Common Issues

1. **Browser Automation Fails**
   - Ensure you have proper access to `jules.google.com`
   - Check if you're logged into your Google account
   - Try running with `HEADLESS=false` to see what's happening

2. **Task Creation Fails**
   - Verify repository names are correct (`owner/repo-name` format)
   - Ensure you have access to the specified repositories
   - Check that branches exist

3. **Permission Errors**
   - Make sure you have write access to the data storage path
   - Verify repository permissions in GitHub

### Debug Mode

Enable debug mode for troubleshooting:

```bash
DEBUG=true HEADLESS=false npm start
```

This will:
- Show browser interactions visually
- Take screenshots on errors
- Provide detailed logging

## Development

### Project Structure

```
google-jules-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── docs/
│   └── referencerecordings/  # Browser automation references
├── scripts/
│   └── test-mcp.js       # Testing script
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── smithery.yaml         # MCP deployment config
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Testing

```bash
# Run the test suite
npm test

# Build and test
npm run build && npm test

# Development mode with file watching
npm run dev
```

## Architecture

The MCP follows established patterns:

- **Browser Automation**: Uses Playwright for reliable web automation
- **Data Persistence**: Local JSON storage for task tracking
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Resource Management**: Proper browser lifecycle management
- **Security**: No credential storage, relies on browser session

## Workflow Integration

This MCP is designed to integrate with development workflows:

1. **Issue Tracking → Jules Tasks**: Convert GitHub issues to Jules tasks
2. **Code Review → Automation**: Automate code review processes
3. **CI/CD Integration**: Trigger Jules tasks from deployment pipelines
4. **Team Collaboration**: Share Jules task management across teams

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Inspired by the tusclasesparticulares-mcp implementation patterns
- Browser automation powered by [Playwright](https://playwright.dev/)

---

**Note**: This MCP requires access to Google Jules. Ensure you have appropriate permissions and access to the repositories you want to manage.