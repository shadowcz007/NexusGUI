const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// 导入重构后的工具系统
const ToolRegistry = require('./tools/ToolRegistry');
const RenderGUITool = require('./tools/RenderGUITool');
const GetContextTool = require('./tools/GetContextTool');
const InjectJSTool = require('./tools/InjectJSTool');
const NotificationTool = require('./tools/NotificationTool');
const ShowInFileManagerTool = require('./tools/ShowInFileManagerTool');
const RenderHistoryTool = require('./tools/RenderHistoryTool');

const NetworkStatusTool = require('./tools/NetworkStatusTool');
const DebugLogsTool = require('./tools/DebugLogsTool');
const MonitorInfoTool = require('./tools/MonitorInfoTool');
const TestTool = require('./tools/TestTool');

// 读取 package.json 获取项目信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));

// Dynamic imports for ES modules
let Server, SSEServerTransport, CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError;

// 全局工具注册器实例
let globalToolRegistry = null;

// Initialize modules
async function initializeModules() {
    if (!Server) {
        const sdkServer = await
        import ('@modelcontextprotocol/sdk/server/index.js');
        Server = sdkServer.Server;

        const sdkTypes = await
        import ('@modelcontextprotocol/sdk/types.js');
        CallToolRequestSchema = sdkTypes.CallToolRequestSchema;
        ErrorCode = sdkTypes.ErrorCode;
        ListToolsRequestSchema = sdkTypes.ListToolsRequestSchema;
        McpError = sdkTypes.McpError;

        const sseTransport = await
        import ('./transport.js');
        SSEServerTransport = sseTransport.SSEServerTransport;
    }
}

// 初始化工具注册器
async function initializeToolRegistry() {
    if (!globalToolRegistry) {
        console.log('🔧 初始化工具注册器...');

        globalToolRegistry = new ToolRegistry();

        // 注册所有工具
        globalToolRegistry.register(new RenderGUITool());
        globalToolRegistry.register(new GetContextTool());
        globalToolRegistry.register(new InjectJSTool());
        // globalToolRegistry.register(new ShowInFileManagerTool());
        // globalToolRegistry.register(new RenderHistoryTool());
        // globalToolRegistry.register(new QuickTestTool());
        // globalToolRegistry.register(new NetworkStatusTool());
        // globalToolRegistry.register(new DebugLogsTool());
        // globalToolRegistry.register(new MonitorInfoTool());
        // globalToolRegistry.register(new TestTool());
        // globalToolRegistry.register(new NotificationTool());

        // 初始化所有工具
        await globalToolRegistry.initialize();

        console.log('✅ 工具注册器初始化完成');
        console.log('📊 工具统计:', globalToolRegistry.getStats());
    }

    return globalToolRegistry;
}

/**
 * 创建 MCP 服务器实例
 */
const getServer = async() => {
    await initializeModules();

    const server = new Server({
        name: `${packageJson.name}-sse-server`,
        version: packageJson.version,
    }, {
        capabilities: {
            tools: {},
            logging: {},
        },
    });

    // 初始化工具注册器
    const toolRegistry = await initializeToolRegistry();

    // 注册工具列表处理器
    server.setRequestHandler(ListToolsRequestSchema, async() => {
        return {
            tools: toolRegistry.getToolSchemas()
        };
    });

    // 处理工具调用
    server.setRequestHandler(CallToolRequestSchema, async(request) => {
        const { name, arguments: args } = request.params;

        try {
            // 对于通知工具，需要传递服务器实例
            if (name === 'start-notification-stream') {
                const notificationTool = toolRegistry.getTool(name);
                if (notificationTool) {
                    return await notificationTool.execute(args, server);
                }
            }

            // 使用工具注册器执行工具
            return await toolRegistry.executeTool(name, args);
        } catch (error) {
            console.error(`工具 ${name} 执行失败:`, error);
            throw new McpError(
                ErrorCode.InternalError,
                `工具执行失败: ${error.message}`
            );
        }
    });

    return server;
};


// Express 应用
const app = express();

// 配置 CORS 中间件
app.use(cors({
    origin: function(origin, callback) {
        // 允许所有来源，或者你可以指定特定的域名
        // 例如: ['http://localhost:3000', 'http://localhost:8080']
        // console.log(`🌐 CORS 请求来源: ${origin}`);
        callback(null, true);
    },
    credentials: true, // 允许携带凭证
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 预检请求缓存时间（秒）
}));

// 增加详细的请求日志中间件
app.use((req, res, next) => {
    // console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    // console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// 为 /messages 端点完全跳过 body 解析，让 SDK 自己处理
app.use('/messages', (req, res, next) => {
    // 不解析 body，保持原始流
    next();
});

// 为其他端点使用 JSON 解析
app.use((req, res, next) => {
    if (req.path !== '/messages') {
        express.json({
            limit: '50mb',
            verify: (req, res, buf) => {
                // 记录原始请求体用于调试
                if (buf.length > 0) {
                    console.log(`🔍 Raw request body:`, buf.toString());
                }
            }
        })(req, res, next);
    } else {
        next();
    }
});

// 存储传输层实例
const transports = {};

// 定期更新网络状态
let networkStatusInterval = null;

// 启动网络状态更新定时器
function startNetworkStatusUpdater(appStateService) {
    if (networkStatusInterval) {
        clearInterval(networkStatusInterval);
    }

    networkStatusInterval = setInterval(() => {
        if (appStateService) {
            const activeSessions = Object.keys(transports).length;
            const now = new Date().toISOString();

            // 更新网络状态
            appStateService.updateNetworkStatus({
                activeSessions: activeSessions,
                lastActivity: now,
                totalSessions: activeSessions
            });
        }
    }, 5000); // 每5秒更新一次
}

// 停止网络状态更新定时器
function stopNetworkStatusUpdater() {
    if (networkStatusInterval) {
        clearInterval(networkStatusInterval);
        networkStatusInterval = null;
    }
}

// 创建服务器函数，供 Electron 集成使用
async function createServer(port = 3001) {
    // 启动网络状态更新定时器
    if (global.appStateService) {
        startNetworkStatusUpdater(global.appStateService);
    }

    // 在启动服务器之前确保工具注册器已初始化
    await initializeToolRegistry();

    // 确保工具注册器在全局可访问
    if (globalToolRegistry) {
        global.toolRegistry = globalToolRegistry;
    }

    // SSE 端点：建立流连接
    app.get('/mcp', async(req, res) => {
        // console.log('收到 GET 请求到 /mcp (建立 SSE 流)');
        // console.log(`🔍 Query parameters:`, req.query);
        // console.log(`🔍 Request headers:`, req.headers);

        try {
            // 确保模块已初始化
            await initializeModules();

            // 为客户端创建新的 SSE 传输层
            const transport = new SSEServerTransport('/messages', res);
            // console.log(`🔧 创建新的 SSE 传输层实例`);

            // 设置关闭处理器
            transport.onclose = () => {
                // console.log(`SSE 传输层已关闭，会话 ID: ${transport.sessionId}`);
                if (transport.sessionId) {
                    delete transports[transport.sessionId];
                    console.log(`🗑️ 已从传输层存储中删除会话 ${transport.sessionId}`);
                }

                // 更新网络状态
                if (global.appStateService) {
                    const activeSessions = Object.keys(transports).length;
                    global.appStateService.updateNetworkStatus({
                        activeSessions: activeSessions,
                        totalSessions: activeSessions
                    });
                }
            };

            // 设置错误处理器
            transport.onerror = (error) => {
                console.error(`❌ SSE 传输层错误:`, error);
            };

            // 连接传输层到 MCP 服务器
            const server = await getServer();
            // console.log(`🔗 正在连接传输层到 MCP 服务器...`);
            await server.connect(transport);

            // 启动传输层
            // console.log(`🚀 正在启动传输层...`);
            await transport.start();

            // 按会话 ID 存储传输层（在连接后获取 sessionId）
            const sessionId = transport.sessionId;
            if (sessionId) {
                transports[sessionId] = transport;
                console.log(`💾 已存储传输层，会话 ID: ${sessionId}`);
                console.log(`📊 当前活动传输层数量: ${Object.keys(transports).length}`);
            } else {
                console.warn(`⚠️ 传输层没有生成会话 ID`);
            }

            console.log(`✅ 已建立 SSE 流，会话 ID: ${sessionId}`);
        } catch (error) {
            console.error('❌ 建立 SSE 流时出错:', error);
            console.error('❌ 错误堆栈:', error.stack);
            if (!res.headersSent) {
                res.status(500).send('建立 SSE 流时出错');
            }
        }
    });

    // 消息端点：接收客户端 JSON-RPC 请求
    app.post('/messages', async(req, res) => {
        // console.log('📨 收到 POST 请求到 /messages');
        // console.log(`🔍 URL: ${req.url}`);
        // console.log(`🔍 Query:`, req.query);
        // console.log(`🔍 Headers:`, req.headers);

        // 记录原始请求体（现在是原始流）
        // if (req.body) {
        //     if (Buffer.isBuffer(req.body)) {
        //         console.log(`🔍 Raw request body:`, req.body.toString());
        //     } else {
        //         console.log(`🔍 Raw request body:`, req.body);
        //     }
        // }

        // 从 URL 查询参数提取会话 ID
        const sessionId = req.query.sessionId;
        // console.log(`🔍 提取的会话 ID: ${sessionId}`);

        if (!sessionId) {
            console.error('❌ 请求 URL 中未提供会话 ID');
            console.error(`❌ 完整 URL: ${req.url}`);
            console.error(`❌ 查询参数:`, req.query);
            res.status(400).json({
                error: '缺少 sessionId 参数',
                message: '请求 URL 中必须包含 sessionId 查询参数',
                example: '/messages?sessionId=your-session-id'
            });
            return;
        }

        const transport = transports[sessionId];
        // console.log(`🔍 查找会话 ${sessionId} 的传输层:`, transport ? '找到' : '未找到');
        // console.log(`📊 当前所有会话 ID:`, Object.keys(transports));

        if (!transport) {
            console.error(`❌ 未找到会话 ID 为 ${sessionId} 的活动传输层`);
            console.error(`❌ 可用的会话 ID:`, Object.keys(transports));
            res.status(404).json({
                error: '会话未找到',
                message: `会话 ID ${sessionId} 不存在或已过期`,
                availableSessions: Object.keys(transports),
                sessionId: sessionId
            });
            return;
        }

        // console.log(`✅ 找到传输层，正在处理请求...`);
        // console.log(`🔍 传输层状态:`, {
        //     isConnected: transport.isConnected,
        //     sessionId: transport.sessionId,
        //     hasSDKTransport: !!transport.sdkTransport
        // });

        try {
            // 使用传输层处理 POST 消息
            // console.log(`🔄 调用传输层的 handlePostMessage 方法...`);
            await transport.handlePostMessage(req, res, req.body);
            // console.log(`✅ 传输层处理完成`);
        } catch (error) {
            console.error('❌ 处理请求时出错:', error);
            console.error('❌ 错误堆栈:', error.stack);
            if (!res.headersSent) {
                res.status(500).json({
                    error: '处理请求时出错',
                    message: error.message,
                    stack: error.stack
                });
            }
        }
    });

    // 健康检查端点
    app.get('/health', (req, res) => {
        const healthInfo = {
            status: 'ok',
            activeSessions: Object.keys(transports).length,
            server: `${packageJson.build?.productName || packageJson.name || 'NexusGUI'} SSE MCP Server`,
            version: packageJson.version,
            timestamp: new Date().toISOString(),
            sessions: Object.keys(transports).map(id => ({
                sessionId: id,
                isConnected: (transports[id] && transports[id].isConnected) || false
            }))
        };
        console.log(`🏥 健康检查:`, healthInfo);

        // 检查是否请求JSON格式
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json(healthInfo);
            return;
        }

        // 返回HTML格式的健康检查页面
        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 服务器健康检查</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            text-align: center;
        }
        .status-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        .title {
            font-size: 2rem;
            font-weight: 700;
            color: #10b981;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        .health-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .health-item {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #10b981;
        }
        .health-label {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 5px;
        }
        .health-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #10b981;
        }
        .timestamp {
            color: #666;
            font-size: 0.9rem;
            margin-top: 20px;
        }
        .refresh-btn {
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            background: #059669;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status-icon">✅</div>
        <h1 class="title">服务器运行正常</h1>
        <p class="subtitle">所有系统组件工作正常</p>
        
        <div class="health-grid">
            <div class="health-item">
                <div class="health-label">服务器状态</div>
                <div class="health-value">${healthInfo.status.toUpperCase()}</div>
            </div>
            <div class="health-item">
                <div class="health-label">活动会话</div>
                <div class="health-value">${healthInfo.activeSessions}</div>
            </div>
            <div class="health-item">
                <div class="health-label">服务器版本</div>
                <div class="health-value">${healthInfo.version}</div>
            </div>
            <div class="health-item">
                <div class="health-label">运行时间</div>
                <div class="health-value">${Math.floor((Date.now() - new Date(healthInfo.timestamp).getTime()) / 1000)}s</div>
            </div>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 刷新状态</button>
        
        <div class="timestamp">
            检查时间: ${new Date(healthInfo.timestamp).toLocaleString('zh-CN')}
        </div>
    </div>
    
    <script>
        // 自动刷新
        setInterval(() => {
            location.reload();
        }, 10000); // 10秒自动刷新
        
        console.log('🏥 健康检查页面已加载');
        console.log('📊 健康信息:', ${JSON.stringify(healthInfo)});
    </script>
</body>
</html>`;

        res.send(html);
    });

    // 调试端点：显示所有活动会话
    app.get('/debug/sessions', (req, res) => {
                try {
                    const debugInfo = {
                        totalSessions: Object.keys(transports).length,
                        timestamp: new Date().toISOString(),
                        server: {
                            name: `${packageJson.name}-sse-server`,
                            version: packageJson.version,
                            port: port || 3001
                        },
                        sessions: Object.keys(transports).map(id => {
                            const transport = transports[id];
                            return {
                                sessionId: id,
                                isConnected: transport ? (transport.isConnected || false) : false,
                                hasSDKTransport: transport ? (!!transport.sdkTransport) : false,
                                sessionIdFromTransport: transport ? (transport.sessionId || null) : null,
                                createdAt: transport ? (transport.createdAt || null) : null,
                                lastActivity: transport ? (transport.lastActivity || null) : null
                            };
                        })
                    };

                    console.log(`🐛 调试信息:`, debugInfo);

                    // 检查是否请求JSON格式
                    if (req.headers.accept && req.headers.accept.includes('application/json')) {
                        res.json(debugInfo);
                        return;
                    }

                    // 返回HTML格式的调试页面
                    const sessionsHTML = debugInfo.sessions.map(session => `
                <div class="session-card ${session.isConnected ? 'connected' : 'disconnected'}">
                    <div class="session-header">
                        <span class="session-status">${session.isConnected ? '🟢' : '🔴'}</span>
                        <span class="session-id">${session.sessionId}</span>
                    </div>
                    <div class="session-details">
                        <div class="detail-item">
                            <span class="label">连接状态:</span>
                            <span class="value ${session.isConnected ? 'connected' : 'disconnected'}">
                                ${session.isConnected ? '已连接' : '已断开'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="label">SDK传输层:</span>
                            <span class="value">${session.hasSDKTransport ? '✅ 已初始化' : '❌ 未初始化'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">创建时间:</span>
                            <span class="value">${session.createdAt ? new Date(session.createdAt).toLocaleString('zh-CN') : '未知'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">最后活动:</span>
                            <span class="value">${session.lastActivity ? new Date(session.lastActivity).toLocaleString('zh-CN') : '未知'}</span>
                        </div>
                    </div>
                </div>
            `).join('');

                    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 服务器调试信息</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .server-info {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            border-left: 4px solid #3b82f6;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
        }
        .info-label {
            font-weight: 500;
            color: #666;
        }
        .info-value {
            font-weight: 600;
            color: #333;
        }
        .sessions-section {
            margin-top: 30px;
        }
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
        }
        .section-title::before {
            content: '🔍';
            margin-right: 10px;
        }
        .sessions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .session-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 2px solid #e5e7eb;
            transition: all 0.3s ease;
        }
        .session-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .session-card.connected {
            border-color: #10b981;
        }
        .session-card.disconnected {
            border-color: #ef4444;
        }
        .session-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        .session-status {
            font-size: 1.2rem;
            margin-right: 10px;
        }
        .session-id {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .session-details {
            space-y: 8px;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
        }
        .detail-item .label {
            font-weight: 500;
            color: #666;
            font-size: 0.9rem;
        }
        .detail-item .value {
            font-weight: 600;
            font-size: 0.9rem;
        }
        .detail-item .value.connected {
            color: #10b981;
        }
        .detail-item .value.disconnected {
            color: #ef4444;
        }
        .no-sessions {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 1.1rem;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        }
        .timestamp {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🔍 MCP 服务器调试</h1>
            <p class="subtitle">实时会话监控与状态信息</p>
        </div>
        
        <div class="server-info">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">服务器名称</span>
                    <span class="info-value">${debugInfo.server.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">版本</span>
                    <span class="info-value">${debugInfo.server.version}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">监听端口</span>
                    <span class="info-value">${debugInfo.server.port}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">活动会话</span>
                    <span class="info-value">${debugInfo.totalSessions}</span>
                </div>
            </div>
        </div>
        
        <div class="sessions-section">
            <h2 class="section-title">活动会话 (${debugInfo.totalSessions})</h2>
            
            ${debugInfo.totalSessions > 0 ? `
            <div class="sessions-grid">
                ${sessionsHTML}
            </div>
            ` : `
            <div class="no-sessions">
                <p>🔍 当前没有活动会话</p>
                <p>等待客户端连接...</p>
            </div>
            `}
        </div>
        
        <div class="timestamp">
            最后更新: ${new Date(debugInfo.timestamp).toLocaleString('zh-CN')}
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新</button>
    
    <script>
        // 自动刷新
        setInterval(() => {
            location.reload();
        }, 30000); // 30秒自动刷新
        
        console.log('🐛 调试页面已加载');
        console.log('📊 服务器信息:', ${JSON.stringify(debugInfo)});
    </script>
</body>
</html>`;
            
            res.send(html);
        } catch (error) {
            console.error('❌ 生成调试信息时出错:', error);
            res.status(500).json({
                error: '生成调试信息失败',
                message: error.message,
                totalSessions: Object.keys(transports).length,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 启动服务器
    const server = app.listen(port, (error) => {
        if (error) {
            console.error('❌ 启动服务器失败:', error);
            throw error;
        }
        console.log(`🚀 ${packageJson.build?.productName || packageJson.name || 'NexusGUI'} SSE MCP 服务器已启动，监听端口 ${port}`);
        console.log(`📡 SSE 端点: http://localhost:${port}/mcp`);
        console.log(`📨 消息端点: http://localhost:${port}/messages`);
        console.log(`🏥 健康检查: http://localhost:${port}/health`);
        console.log(`🐛 调试端点: http://localhost:${port}/debug/sessions`);
        console.log(`🌐 CORS 已启用，允许跨域请求`);
        
        console.log(`✅ 工具注册器已初始化，共 ${globalToolRegistry ? globalToolRegistry.getStats().totalTools : 0} 个工具`);
    });

    // 返回服务器实例和关闭函数
    return {
        server,
        toolRegistry: globalToolRegistry, // 暴露工具注册器
        close: async() => {
            console.log('正在关闭 SSE 服务器...');

            // 停止网络状态更新定时器
            stopNetworkStatusUpdater();

            // 清理工具注册器
            if (globalToolRegistry) {
                try {
                    await globalToolRegistry.cleanup();
                    globalToolRegistry = null;
                } catch (error) {
                    console.error('清理工具注册器时出错:', error);
                }
            }

            // 关闭所有活动传输层以正确清理资源
            for (const sessionId in transports) {
                try {
                    console.log(`正在关闭会话 ${sessionId} 的传输层`);
                    await transports[sessionId].close();
                    delete transports[sessionId];
                } catch (error) {
                    console.error(`关闭会话 ${sessionId} 的传输层时出错:`, error);
                }
            }

            server.close(() => {
                console.log('SSE 服务器关闭完成');
            });
        }
    };
}

// 如果直接运行此文件，则启动独立服务器
if (require.main === module) {
    const { server, close } = createServer(process.env.PORT || 3001);

    // 处理服务器关闭
    process.on('SIGINT', async() => {
        console.log('正在关闭服务器...');
        await close();
        process.exit(0);
    });

    process.on('SIGTERM', async() => {
        console.log('正在关闭服务器...');
        await close();
        process.exit(0);
    });
}

module.exports = { createServer };