#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
class GoogleJulesMCP {
    constructor() {
        this.browser = null;
        this.page = null;
        this.config = {
            headless: process.env.HEADLESS !== 'false',
            timeout: parseInt(process.env.TIMEOUT || '30000'),
            debug: process.env.DEBUG === 'true',
            dataPath: process.env.JULES_DATA_PATH || path.join(os.homedir(), '.jules-mcp', 'data.json'),
            baseUrl: 'https://jules.google.com',
            userDataDir: process.env.CHROME_USER_DATA_DIR,
            useExistingSession: process.env.USE_EXISTING_SESSION === 'true',
            cookiePath: process.env.COOKIES_PATH,
            sessionMode: process.env.SESSION_MODE || 'fresh',
            // Browserbase configuration
            browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
            browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID,
            browserbaseSessionId: process.env.BROWSERBASE_SESSION_ID,
            // Google Auth Cookies as string
            googleAuthCookies: process.env.GOOGLE_AUTH_COOKIES
        };
        this.dataPath = this.config.dataPath;
        this.server = new Server({
            name: 'google-jules-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        this.setupToolHandlers();
        this.setupResourceHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'jules_create_task',
                        description: 'Create a new task in Google Jules with repository and description',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                description: {
                                    type: 'string',
                                    description: 'Task description - what you want Jules to do',
                                },
                                repository: {
                                    type: 'string',
                                    description: 'GitHub repository in format owner/repo-name',
                                },
                                branch: {
                                    type: 'string',
                                    description: 'Git branch to work on (optional, defaults to main)',
                                },
                            },
                            required: ['description', 'repository'],
                        },
                    },
                    {
                        name: 'jules_get_task',
                        description: 'Get details of a specific Jules task by ID or URL',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID or full Jules task URL',
                                },
                            },
                            required: ['taskId'],
                        },
                    },
                    {
                        name: 'jules_send_message',
                        description: 'Send a message/instruction to Jules in an active task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID or URL',
                                },
                                message: {
                                    type: 'string',
                                    description: 'Message to send to Jules',
                                },
                            },
                            required: ['taskId', 'message'],
                        },
                    },
                    {
                        name: 'jules_approve_plan',
                        description: 'Approve Jules execution plan for a task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID or URL',
                                },
                            },
                            required: ['taskId'],
                        },
                    },
                    {
                        name: 'jules_resume_task',
                        description: 'Resume a paused Jules task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID or URL',
                                },
                            },
                            required: ['taskId'],
                        },
                    },
                    {
                        name: 'jules_list_tasks',
                        description: 'List all Jules tasks with their status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['all', 'active', 'pending', 'completed', 'paused'],
                                    description: 'Filter tasks by status',
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of tasks to return (default 10)',
                                },
                            },
                        },
                    },
                    {
                        name: 'jules_analyze_code',
                        description: 'Analyze code changes and diff in a Jules task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID or URL',
                                },
                                includeSourceCode: {
                                    type: 'boolean',
                                    description: 'Whether to include full source code content',
                                },
                            },
                            required: ['taskId'],
                        },
                    },
                    {
                        name: 'jules_bulk_create_tasks',
                        description: 'Create multiple tasks from a list of descriptions and repositories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                tasks: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            repository: { type: 'string' },
                                            branch: { type: 'string' },
                                        },
                                        required: ['description', 'repository'],
                                    },
                                    description: 'Array of task objects to create',
                                },
                            },
                            required: ['tasks'],
                        },
                    },
                    {
                        name: 'jules_screenshot',
                        description: 'Take a screenshot of current Jules page for debugging',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Optional task ID to navigate to first',
                                },
                                filename: {
                                    type: 'string',
                                    description: 'Optional filename for screenshot',
                                },
                            },
                        },
                    },
                    {
                        name: 'jules_get_cookies',
                        description: 'Get current browser cookies for session persistence',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                format: {
                                    type: 'string',
                                    enum: ['json', 'string'],
                                    description: 'Output format for cookies (default: json)',
                                },
                            },
                        },
                    },
                    {
                        name: 'jules_set_cookies',
                        description: 'Set browser cookies from string or JSON for authentication',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                cookies: {
                                    type: 'string',
                                    description: 'Cookies as JSON string or cookie string format',
                                },
                                format: {
                                    type: 'string',
                                    enum: ['json', 'string'],
                                    description: 'Format of input cookies (default: json)',
                                },
                            },
                            required: ['cookies'],
                        },
                    },
                    {
                        name: 'jules_session_info',
                        description: 'Get current session configuration and status',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'jules_create_task':
                        return await this.createTask(args);
                    case 'jules_get_task':
                        return await this.getTask(args);
                    case 'jules_send_message':
                        return await this.sendMessage(args);
                    case 'jules_approve_plan':
                        return await this.approvePlan(args);
                    case 'jules_resume_task':
                        return await this.resumeTask(args);
                    case 'jules_list_tasks':
                        return await this.listTasks(args);
                    case 'jules_analyze_code':
                        return await this.analyzeCode(args);
                    case 'jules_bulk_create_tasks':
                        return await this.bulkCreateTasks(args);
                    case 'jules_screenshot':
                        return await this.takeScreenshot(args);
                    case 'jules_get_cookies':
                        return await this.getCookies(args);
                    case 'jules_set_cookies':
                        return await this.setCookies(args);
                    case 'jules_session_info':
                        return await this.getSessionInfo(args);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new McpError(ErrorCode.InternalError, `Error in ${name}: ${errorMessage}`);
            }
        });
    }
    setupResourceHandlers() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: [
                    {
                        uri: 'jules://schemas/task',
                        name: 'Task Schema',
                        description: 'Complete task model with all available attributes',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'jules://current/active-tasks',
                        name: 'Active Tasks',
                        description: 'Live list of active tasks in Jules',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'jules://templates/common-tasks',
                        name: 'Common Task Templates',
                        description: 'Template examples for common development tasks',
                        mimeType: 'application/json'
                    },
                ]
            };
        });
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            switch (uri) {
                case 'jules://schemas/task':
                    return {
                        contents: [{
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    id: 'string',
                                    title: 'string',
                                    description: 'string',
                                    repository: 'string (owner/repo-name)',
                                    branch: 'string',
                                    status: 'pending | in_progress | completed | paused',
                                    createdAt: 'ISO timestamp',
                                    updatedAt: 'ISO timestamp',
                                    url: 'Jules task URL',
                                    chatHistory: 'array of chat messages',
                                    sourceFiles: 'array of modified files'
                                }, null, 2)
                            }]
                    };
                case 'jules://current/active-tasks':
                    const activeTasks = await this.getActiveTasks();
                    return {
                        contents: [{
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(activeTasks, null, 2)
                            }]
                    };
                case 'jules://templates/common-tasks':
                    return {
                        contents: [{
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    'bug-fix': 'Fix the [specific issue] in [filename]. The problem is [description].',
                                    'feature-add': 'Add [feature name] functionality to [location]. Requirements: [list requirements].',
                                    'refactor': 'Refactor [component/function] to improve [performance/readability/maintainability].',
                                    'test-add': 'Add comprehensive tests for [component/function] covering [test cases].',
                                    'documentation': 'Update documentation for [component] to include [new features/changes].',
                                    'dependency-update': 'Update [dependency name] to version [version] and fix any breaking changes.',
                                    'security-fix': 'Fix security vulnerability in [location]: [description of vulnerability].',
                                    'performance': 'Optimize [component/function] performance by [specific optimization approach].'
                                }, null, 2)
                            }]
                    };
                default:
                    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
            }
        });
    }
    // Browserbase session management
    async createBrowserbaseSession() {
        if (!this.config.browserbaseApiKey || !this.config.browserbaseProjectId) {
            throw new Error('Browserbase API key and project ID are required for browserbase mode');
        }
        const response = await axios.post(`https://www.browserbase.com/v1/projects/${this.config.browserbaseProjectId}/sessions`, {
            keepAlive: true,
            timeout: this.config.timeout,
        }, {
            headers: {
                'x-bb-api-key': this.config.browserbaseApiKey,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    }
    async getBrowserbaseConnectUrl() {
        if (this.config.browserbaseSessionId) {
            // Use existing session
            return `wss://connect.browserbase.com?apiKey=${this.config.browserbaseApiKey}&sessionId=${this.config.browserbaseSessionId}`;
        }
        else {
            // Create new session
            const session = await this.createBrowserbaseSession();
            console.error(`Created Browserbase session: ${session.id}`);
            return session.connectUrl;
        }
    }
    // Cookie management
    parseCookiesFromString(cookieString) {
        return cookieString.split(';').map(cookie => {
            const [nameValue, ...rest] = cookie.trim().split('=');
            const [name, value] = nameValue.split('=');
            const domain = rest.find(part => part.trim().startsWith('domain='))?.split('=')[1] || '.google.com';
            return { name: name.trim(), value: value?.trim() || '', domain };
        }).filter(cookie => cookie.name && cookie.value);
    }
    async loadCookiesFromFile(cookiePath) {
        try {
            const cookieData = await fs.readFile(cookiePath, 'utf-8');
            return JSON.parse(cookieData);
        }
        catch (error) {
            console.error(`Failed to load cookies from ${cookiePath}:`, error);
            return [];
        }
    }
    async saveCookiesToFile(cookies, cookiePath) {
        try {
            await fs.mkdir(path.dirname(cookiePath), { recursive: true });
            await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        }
        catch (error) {
            console.error(`Failed to save cookies to ${cookiePath}:`, error);
        }
    }
    // Browser management with comprehensive session support
    async getBrowser() {
        if (!this.browser) {
            switch (this.config.sessionMode) {
                case 'browserbase':
                    const connectUrl = await this.getBrowserbaseConnectUrl();
                    this.browser = await chromium.connectOverCDP(connectUrl);
                    break;
                case 'chrome-profile':
                    if (!this.config.userDataDir) {
                        throw new Error('CHROME_USER_DATA_DIR must be set for chrome-profile mode');
                    }
                    // For persistent contexts, we'll handle this differently in getPage
                    this.browser = await chromium.launch({
                        headless: this.config.headless,
                        timeout: this.config.timeout
                    });
                    break;
                case 'persistent':
                    // For persistent contexts, we'll handle this differently in getPage
                    this.browser = await chromium.launch({
                        headless: this.config.headless,
                        timeout: this.config.timeout
                    });
                    break;
                case 'cookies':
                case 'fresh':
                default:
                    this.browser = await chromium.launch({
                        headless: this.config.headless,
                        timeout: this.config.timeout
                    });
                    break;
            }
        }
        return this.browser;
    }
    async getPage() {
        if (!this.page) {
            // Handle persistent contexts separately
            if (this.config.sessionMode === 'chrome-profile' && this.config.userDataDir) {
                const context = await chromium.launchPersistentContext(this.config.userDataDir, {
                    headless: this.config.headless,
                    timeout: this.config.timeout,
                });
                const pages = context.pages();
                this.page = pages.length > 0 ? pages[0] : await context.newPage();
            }
            else if (this.config.sessionMode === 'persistent') {
                const persistentDir = this.config.userDataDir || path.join(os.homedir(), '.jules-mcp', 'browser-data');
                const context = await chromium.launchPersistentContext(persistentDir, {
                    headless: this.config.headless,
                    timeout: this.config.timeout,
                });
                const pages = context.pages();
                this.page = pages.length > 0 ? pages[0] : await context.newPage();
            }
            else {
                const browser = await this.getBrowser();
                if (this.config.sessionMode === 'browserbase') {
                    // For Browserbase, get existing pages or create new one
                    const contexts = browser.contexts();
                    if (contexts.length > 0) {
                        const pages = contexts[0].pages();
                        this.page = pages.length > 0 ? pages[0] : await contexts[0].newPage();
                    }
                    else {
                        this.page = await browser.newPage();
                    }
                }
                else {
                    this.page = await browser.newPage();
                }
            }
            await this.page.setViewportSize({ width: 1200, height: 800 });
            // Load cookies if specified
            await this.loadSessionCookies();
        }
        return this.page;
    }
    async loadSessionCookies() {
        if (!this.page)
            return;
        let cookies = [];
        // Load cookies from string
        if (this.config.googleAuthCookies) {
            cookies = this.parseCookiesFromString(this.config.googleAuthCookies);
            console.error(`Loaded ${cookies.length} cookies from environment variable`);
        }
        // Load cookies from file
        else if (this.config.cookiePath && this.config.sessionMode === 'cookies') {
            cookies = await this.loadCookiesFromFile(this.config.cookiePath);
            console.error(`Loaded ${cookies.length} cookies from file`);
        }
        // Set cookies if any were loaded
        if (cookies.length > 0) {
            await this.page.context().addCookies(cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: '/',
            })));
            console.error(`Set ${cookies.length} cookies in browser context`);
        }
    }
    async saveSessionCookies() {
        if (!this.page || !this.config.cookiePath || this.config.sessionMode !== 'cookies')
            return;
        try {
            const cookies = await this.page.context().cookies();
            const simplifiedCookies = cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain
            }));
            await this.saveCookiesToFile(simplifiedCookies, this.config.cookiePath);
            console.error(`Saved ${cookies.length} cookies to file`);
        }
        catch (error) {
            console.error('Failed to save cookies:', error);
        }
    }
    // Data persistence
    async loadTaskData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { tasks: [] };
            }
            throw error;
        }
    }
    async saveTaskData(data) {
        await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
        await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    }
    // Task ID extraction
    extractTaskId(taskIdOrUrl) {
        if (taskIdOrUrl.includes('jules.google.com/task/')) {
            const match = taskIdOrUrl.match(/\/task\/([^/]+)/);
            return match ? match[1] : taskIdOrUrl;
        }
        return taskIdOrUrl;
    }
    // Tool implementations
    async createTask(args) {
        const { description, repository, branch = 'main' } = args;
        const page = await this.getPage();
        try {
            // Navigate to Jules task creation
            await page.goto(`${this.config.baseUrl}/task`);
            await page.waitForLoadState('networkidle');
            // Click new task button if needed
            const newTaskButton = page.locator('button.mat-mdc-tooltip-trigger svg');
            if (await newTaskButton.isVisible()) {
                await newTaskButton.click();
            }
            // Repository selection
            await page.locator("div.repo-select div.header-container").click();
            await page.locator("div.repo-select input").fill(repository);
            await page.locator("div.repo-select div.opt-list > swebot-option").first().click();
            // Branch selection
            await page.locator("div.branch-select div.header-container > div").click();
            // Try to find specific branch or select first available
            const branchOptions = page.locator("div.branch-select swebot-option");
            const branchCount = await branchOptions.count();
            if (branchCount > 0) {
                await branchOptions.first().click();
            }
            // Task description
            await page.locator("textarea").fill(description);
            await page.keyboard.press('Enter');
            // Submit
            await page.locator("div.chat-container button:nth-of-type(2)").click();
            // Wait for task creation and get URL
            await page.waitForURL('**/task/**');
            const url = page.url();
            const taskId = this.extractTaskId(url);
            // Create task object
            const task = {
                id: taskId,
                title: description.slice(0, 50) + (description.length > 50 ? '...' : ''),
                description,
                repository,
                branch,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                url,
                chatHistory: [],
                sourceFiles: []
            };
            // Save to data
            const data = await this.loadTaskData();
            data.tasks.push(task);
            await this.saveTaskData(data);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Task created successfully!\n\nTask ID: ${taskId}\nRepository: ${repository}\nBranch: ${branch}\nDescription: ${description}\nURL: ${url}\n\nTask is now pending Jules' analysis. You can check progress with jules_get_task.`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to create task: ${error}`);
        }
    }
    async getTask(args) {
        const { taskId } = args;
        const actualTaskId = this.extractTaskId(taskId);
        const page = await this.getPage();
        try {
            // Navigate to task
            const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
            await page.goto(url);
            await page.waitForLoadState('networkidle');
            // Extract task information
            const taskData = await page.evaluate(() => {
                // Extract chat messages
                const chatMessages = Array.from(document.querySelectorAll('div.chat-content')).map(el => ({
                    content: el.textContent?.trim() || '',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                }));
                // Extract source files
                const sourceFiles = Array.from(document.querySelectorAll('div.source-content a')).map(link => ({
                    filename: link.textContent?.trim() || '',
                    url: link.getAttribute('href') || '',
                    status: 'modified'
                }));
                // Extract task status
                const statusEl = document.querySelector('.task-status, [data-status], .status');
                const status = statusEl?.textContent?.toLowerCase() || 'unknown';
                return {
                    chatMessages,
                    sourceFiles,
                    status
                };
            });
            // Update local data
            const data = await this.loadTaskData();
            let task = data.tasks.find(t => t.id === actualTaskId);
            if (task) {
                task.chatHistory = taskData.chatMessages;
                task.sourceFiles = taskData.sourceFiles;
                task.updatedAt = new Date().toISOString();
                await this.saveTaskData(data);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Task Details (${actualTaskId}):\n\n` +
                            `Status: ${taskData.status}\n` +
                            `URL: ${url}\n` +
                            `Source Files (${taskData.sourceFiles.length}):\n` +
                            taskData.sourceFiles.map(f => `  - ${f.filename}`).join('\n') +
                            `\n\nRecent Chat Messages (${taskData.chatMessages.length}):\n` +
                            taskData.chatMessages.slice(-3).map(m => `  - ${m.content.slice(0, 100)}...`).join('\n')
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to get task: ${error}`);
        }
    }
    async sendMessage(args) {
        const { taskId, message } = args;
        const actualTaskId = this.extractTaskId(taskId);
        const page = await this.getPage();
        try {
            const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
            await page.goto(url);
            await page.waitForLoadState('networkidle');
            // Send message
            await page.locator("div.bottom-bar-container textarea").fill(message);
            await page.keyboard.press('Enter');
            // Wait for response (brief)
            await page.waitForTimeout(2000);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Message sent to Jules task ${actualTaskId}: "${message}"\n\nJules is processing your request. Check back with jules_get_task to see the response.`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to send message: ${error}`);
        }
    }
    async approvePlan(args) {
        const { taskId } = args;
        const actualTaskId = this.extractTaskId(taskId);
        const page = await this.getPage();
        try {
            const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
            await page.goto(url);
            await page.waitForLoadState('networkidle');
            // Look for approval button
            const approveButton = page.locator("div.approve-plan-container > button");
            if (await approveButton.isVisible()) {
                await approveButton.click();
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Plan approved for task ${actualTaskId}. Jules will now execute the planned changes.`
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No plan approval needed for task ${actualTaskId}. The task may already be approved or not ready for approval yet.`
                        }
                    ]
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to approve plan: ${error}`);
        }
    }
    async resumeTask(args) {
        const { taskId } = args;
        const actualTaskId = this.extractTaskId(taskId);
        const page = await this.getPage();
        try {
            const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
            await page.goto(url);
            await page.waitForLoadState('networkidle');
            // Look for resume button
            const resumeButton = page.locator("div.resume-button-container svg");
            if (await resumeButton.isVisible()) {
                await resumeButton.click();
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task ${actualTaskId} resumed successfully. Jules will continue working on this task.`
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task ${actualTaskId} doesn't appear to be paused or may already be active.`
                        }
                    ]
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to resume task: ${error}`);
        }
    }
    async listTasks(args) {
        const { status = 'all', limit = 10 } = args;
        const data = await this.loadTaskData();
        let filteredTasks = data.tasks;
        if (status !== 'all') {
            filteredTasks = data.tasks.filter(task => task.status === status);
        }
        const tasks = filteredTasks.slice(0, limit);
        const taskList = tasks.map(task => `${task.id} - ${task.title}\n` +
            `  Repository: ${task.repository}\n` +
            `  Status: ${task.status}\n` +
            `  Created: ${new Date(task.createdAt).toLocaleDateString()}\n` +
            `  URL: ${task.url}\n`).join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Jules Tasks (${tasks.length} of ${filteredTasks.length} total):\n\n${taskList || 'No tasks found.'}`
                }
            ]
        };
    }
    async analyzeCode(args) {
        const { taskId, includeSourceCode = false } = args;
        const actualTaskId = this.extractTaskId(taskId);
        const page = await this.getPage();
        try {
            const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
            await page.goto(url);
            await page.waitForLoadState('networkidle');
            // Extract code analysis information
            const codeData = await page.evaluate((includeSource) => {
                const sourceFiles = Array.from(document.querySelectorAll('div.source-content a')).map(link => ({
                    filename: link.textContent?.trim() || '',
                    url: link.getAttribute('href') || ''
                }));
                const codeChanges = Array.from(document.querySelectorAll('swebot-code-diff-update-card')).map(card => ({
                    type: 'code-change',
                    content: card.textContent?.trim() || ''
                }));
                return {
                    sourceFiles,
                    codeChanges,
                    totalFiles: sourceFiles.length,
                    totalChanges: codeChanges.length
                };
            }, includeSourceCode);
            const analysis = `Code Analysis for Task ${actualTaskId}:\n\n` +
                `Total Files: ${codeData.totalFiles}\n` +
                `Total Changes: ${codeData.totalChanges}\n\n` +
                `Modified Files:\n${codeData.sourceFiles.map(f => `  - ${f.filename}`).join('\n')}\n\n` +
                `Code Changes Summary:\n${codeData.codeChanges.map(c => `  - ${c.content.slice(0, 100)}...`).join('\n')}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: analysis
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to analyze code: ${error}`);
        }
    }
    async bulkCreateTasks(args) {
        const { tasks } = args;
        const results = [];
        for (const taskData of tasks) {
            try {
                const result = await this.createTask(taskData);
                results.push(`✓ ${taskData.repository}: ${taskData.description.slice(0, 50)}...`);
            }
            catch (error) {
                results.push(`✗ ${taskData.repository}: Failed - ${error}`);
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Bulk Task Creation Results (${tasks.length} tasks):\n\n${results.join('\n')}`
                }
            ]
        };
    }
    async takeScreenshot(args) {
        const { taskId, filename } = args;
        const page = await this.getPage();
        try {
            if (taskId) {
                const actualTaskId = this.extractTaskId(taskId);
                const url = taskId.includes('jules.google.com') ? taskId : `${this.config.baseUrl}/task/${actualTaskId}`;
                await page.goto(url);
                await page.waitForLoadState('networkidle');
            }
            const screenshotPath = filename || `jules-screenshot-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Screenshot saved to: ${screenshotPath}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to take screenshot: ${error}`);
        }
    }
    async getCookies(args) {
        const { format = 'json' } = args;
        const page = await this.getPage();
        try {
            const cookies = await page.context().cookies();
            if (format === 'string') {
                const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}; domain=${cookie.domain}; path=${cookie.path}`).join('; ');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Cookie String:\\n${cookieString}`
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Cookies (${cookies.length} total):\\n${JSON.stringify(cookies, null, 2)}`
                        }
                    ]
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to get cookies: ${error}`);
        }
    }
    async setCookies(args) {
        const { cookies, format = 'json' } = args;
        const page = await this.getPage();
        try {
            let cookiesToSet = [];
            if (format === 'string') {
                cookiesToSet = this.parseCookiesFromString(cookies);
            }
            else {
                const parsed = JSON.parse(cookies);
                cookiesToSet = Array.isArray(parsed) ? parsed : [parsed];
            }
            await page.context().addCookies(cookiesToSet.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: '/',
            })));
            // Save cookies if in cookies mode
            if (this.config.sessionMode === 'cookies' && this.config.cookiePath) {
                await this.saveCookiesToFile(cookiesToSet, this.config.cookiePath);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully set ${cookiesToSet.length} cookies. Session authentication should now work for Google Jules.`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to set cookies: ${error}`);
        }
    }
    async getSessionInfo(args) {
        const sessionInfo = {
            sessionMode: this.config.sessionMode,
            hasUserDataDir: !!this.config.userDataDir,
            hasCookiePath: !!this.config.cookiePath,
            hasGoogleAuthCookies: !!this.config.googleAuthCookies,
            hasBrowserbaseConfig: !!(this.config.browserbaseApiKey && this.config.browserbaseProjectId),
            browserbaseSessionId: this.config.browserbaseSessionId,
            isHeadless: this.config.headless,
            timeout: this.config.timeout,
            baseUrl: this.config.baseUrl,
            dataPath: this.config.dataPath,
            browserConnected: !!this.browser,
            pageReady: !!this.page
        };
        return {
            content: [
                {
                    type: 'text',
                    text: `Jules MCP Session Info:\\n${JSON.stringify(sessionInfo, null, 2)}`
                }
            ]
        };
    }
    async getActiveTasks() {
        const data = await this.loadTaskData();
        return data.tasks.filter(task => task.status === 'in_progress' || task.status === 'pending');
    }
    async cleanup() {
        // Save cookies before cleanup if in cookies mode
        await this.saveSessionCookies();
        if (this.page) {
            await this.page.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Google Jules MCP Server running on stdio");
        console.error("Configuration:", {
            headless: this.config.headless,
            timeout: this.config.timeout,
            debug: this.config.debug,
            dataPath: this.config.dataPath
        });
    }
}
// Handle process cleanup
process.on('SIGINT', async () => {
    console.error('Shutting down Jules MCP Server...');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.error('Shutting down Jules MCP Server...');
    process.exit(0);
});
// Start the server
const server = new GoogleJulesMCP();
server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map