# Electron MCP Server SSE 通用架构方案

## 1. 核心架构层次

```
┌─────────────────────────────────────────┐
│           AI Client (Claude/GPT)        │
├─────────────────────────────────────────┤
│         HTTP/SSE Transport Layer        │
├─────────────────────────────────────────┤
│           MCP Protocol Layer            │
├─────────────────────────────────────────┤
│          Tool Registry System           │
├─────────────────────────────────────────┤
│         Electron Main Process           │
└─────────────────────────────────────────┘
```

## 2. 传输层设计模式

### SSE服务器基础结构

```javascript
class UniversalSSEMCPServer {
    constructor(options = {}) {
        this.port = options.port || 3001;
        this.app = express();
        this.transports = new Map(); // 会话管理
        this.toolRegistry = new ToolRegistry();
        this.server = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        // CORS配置
        this.app.use(cors({
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // 条件性body解析（/messages端点跳过）
        this.app.use((req, res, next) => {
            if (req.path !== '/messages') {
                express.json({ limit: '50mb' })(req, res, next);
            } else {
                next();
            }
        });
    }
    
    setupRoutes() {
        // SSE连接建立
        this.app.get('/mcp', this.handleSSEConnection.bind(this));
        
        // JSON-RPC消息处理
        this.app.post('/messages', this.handleMessages.bind(this));
        
        // 健康检查
        this.app.get('/health', this.handleHealthCheck.bind(this));
        
        // 调试接口
        this.app.get('/debug/sessions', this.handleDebugSessions.bind(this));
    }
}
```
## 3. 传输层封装标准

### SSE传输层包装器

```javascript
class SSETransportWrapper {
    constructor(messagesEndpoint, response) {
        this.messagesEndpoint = messagesEndpoint;
        this.response = response;
        this.sdkTransport = null;
        this.sessionId = null;
        this.isConnected = false;
        this.createdAt = new Date().toISOString();
        this.lastActivity = new Date().toISOString();
        
        // 生命周期回调
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
    }
    
    async start() {
        // 动态导入MCP SDK
        const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
        
        // 创建SDK传输层
        this.sdkTransport = new SSEServerTransport(this.messagesEndpoint, this.response);
        
        // 设置回调代理
        this.sdkTransport.onclose = () => {
            this.isConnected = false;
            this.onclose?.();
        };
        
        this.sdkTransport.onerror = (error) => {
            this.onerror?.(error);
        };
        
        // 启动传输层
        await this.sdkTransport.start();
        this.isConnected = true;
        this.sessionId = this.sdkTransport.sessionId;
    }
    
    async handlePostMessage(req, res) {
        this.lastActivity = new Date().toISOString();
        return await this.sdkTransport.handlePostMessage(req, res);
    }
    
    async close() {
        if (this.sdkTransport) {
            await this.sdkTransport.close();
        }
        this.isConnected = false;
    }
}
```
## 4. 工具注册系统标准

### 基础工具接口

```javascript
class BaseMCPTool {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
    
    // 工具Schema定义
    getDefinition() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: this.getSchema()
        };
    }
    
    // 参数验证
    validate(args) {
        // 使用zod或其他验证库
        return true;
    }
    
    // 工具执行
    async execute(args) {
        throw new Error('子类必须实现execute方法');
    }
    
    // 生命周期钩子
    async initialize() {}
    async cleanup() {}
    
    // 日志记录
    log(level, message, data = {}) {
        console.log(`[${level.toUpperCase()}] ${this.name}: ${message}`, data);
    }
}
```
```

### 工具注册器

```javascript
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.initialized = false;
    }
    
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    
    async executeTool(name, args) {
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`未知工具: ${name}`);
        
        tool.validate(args);
        return await tool.execute(args);
    }
    
    getToolSchemas() {
        return Array.from(this.tools.values()).map(tool => tool.getDefinition());
    }
    
    async initialize() {
        for (const tool of this.tools.values()) {
            await tool.initialize();
        }
        this.initialized = true;
    }
}
```
## 5. Electron集成接口标准

### 主进程集成模式

```javascript
// 在main.js中暴露标准接口
global.mcpBridge = {
    // 窗口管理
    createWindow: async (config) => {
        return await windowManager.createWindow(config);
    },
    
    // 文件系统操作
    readFile: async (path) => {
        return await fs.readFile(path, 'utf8');
    },
    
    // 系统信息
    getSystemInfo: async () => {
        return {
            platform: process.platform,
            arch: process.arch,
            version: process.version
        };
    },
    
    // 通知系统
    showNotification: async (options) => {
        return await notificationManager.show(options);
    }
};
```
## 6. 会话管理标准

### 会话生命周期管理

```javascript
class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.cleanupInterval = null;
    }
    
    createSession(transport) {
        const sessionId = transport.sessionId;
        const session = {
            id: sessionId,
            transport: transport,
            createdAt: new Date(),
            lastActivity: new Date(),
            metadata: {}
        };
        
        this.sessions.set(sessionId, session);
        this.setupSessionCleanup(session);
        
        return session;
    }
    
    updateActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
    }
    
    removeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.transport.close();
            this.sessions.delete(sessionId);
        }
    }
    
    // 定期清理过期会话
    startCleanupTimer(intervalMs = 300000) { // 5分钟
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, intervalMs);
    }
}
```
## 7. 配置管理标准

### 服务器配置结构

```javascript
const defaultConfig = {
    server: {
        port: 3001,
        host: 'localhost',
        cors: {
            origin: true,
            credentials: true
        }
    },
    
    mcp: {
        name: 'electron-mcp-server',
        version: '1.0.0',
        capabilities: {
            tools: {},
            logging: {}
        }
    },
    
    session: {
        timeout: 1800000, // 30分钟
        maxSessions: 100,
        cleanupInterval: 300000 // 5分钟
    },
    
    logging: {
        level: 'info',
        enableDebug: false
    }
};
```
## 8. 启动流程标准

### 服务器启动模板

```javascript
class ElectronMCPServer {
    async start(config = {}) {
        // 1. 合并配置
        this.config = { ...defaultConfig, ...config };
        
        // 2. 初始化工具注册器
        await this.toolRegistry.initialize();
        
        // 3. 创建MCP服务器实例
        this.mcpServer = new Server(
            this.config.mcp,
            { capabilities: this.config.mcp.capabilities }
        );
        
        // 4. 注册请求处理器
        this.setupRequestHandlers();
        
        // 5. 启动HTTP服务器
        this.httpServer = this.app.listen(this.config.server.port, () => {
            console.log(`MCP Server started on port ${this.config.server.port}`);
        });
        
        // 6. 启动会话清理定时器
        this.sessionManager.startCleanupTimer();
        
        return this;
    }
    
    async stop() {
        // 清理所有会话
        await this.sessionManager.cleanup();
        
        // 清理工具
        await this.toolRegistry.cleanup();
        
        // 关闭HTTP服务器
        if (this.httpServer) {
            this.httpServer.close();
        }
    }
}
```
## 9. 使用示例

```javascript
// 创建并启动MCP服务器
const server = new ElectronMCPServer();

// 注册自定义工具
server.toolRegistry.register(new WindowTool());
server.toolRegistry.register(new FileTool());
server.toolRegistry.register(new NotificationTool());

// 启动服务器
await server.start({
    server: { port: 3001 },
    mcp: { name: 'my-electron-app' }
});

// 在Electron ready时启动
app.whenReady().then(async () => {
    await server.start();
});
```

## 10. 依赖库清单

### 核心依赖

#### MCP 相关
```json
{
  "@modelcontextprotocol/sdk": "^0.4.0"
}
```
- **用途**: Model Context Protocol SDK，提供MCP服务器和传输层实现
- **关键模块**: `Server`, `SSEServerTransport`, `CallToolRequestSchema`, `ErrorCode`

#### Web 服务器
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```
- **express**: HTTP服务器框架，处理SSE连接和JSON-RPC消息
- **cors**: 跨域资源共享中间件，支持AI客户端连接

#### 数据验证
```json
{
  "zod": "^3.22.4"
}
```
- **用途**: TypeScript优先的模式验证库，用于工具参数验证和类型安全

#### Electron 生态
```json
{
  "electron": "^27.0.0",
  "electron-store": "^10.1.0"
}
```
- **electron**: 桌面应用程序框架
- **electron-store**: 持久化存储解决方案，用于配置和会话管理

### 工具依赖

#### 网络和事件
```json
{
  "eventsource": "^4.0.0",
  "node-fetch": "^3.3.2"
}
```
- **eventsource**: SSE客户端实现，用于测试和调试
- **node-fetch**: HTTP请求库，支持现代fetch API

## 总结

这个通用方案提供了：

- **标准化的传输层封装** - 统一的SSE传输层实现
- **可扩展的工具注册系统** - 模块化的工具管理机制
- **完整的会话管理机制** - 自动化的会话生命周期管理
- **统一的Electron集成接口** - 标准化的主进程桥接
- **灵活的配置管理** - 可定制的服务器配置
- **健壮的错误处理和调试支持** - 完善的日志和调试功能

可以作为任何Electron应用集成MCP Server的基础架构模板。