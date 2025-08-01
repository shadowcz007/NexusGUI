const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// Dynamic imports for ES modules
let Server, SSEServerTransport, CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError;

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

// HTML 渲染模式不需要组件 Schema

/**
 * 创建 MCP 服务器实例
 */
const getServer = async() => {
    await initializeModules();

    const server = new Server({
        name: 'nexusgui-sse-server',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {},
            logging: {},
        },
    });

    // 注册工具：render-gui
    server.setRequestHandler(ListToolsRequestSchema, async() => {
        return {
            tools: [{
                    name: 'render-gui',
                    description: '渲染 HTML 界面到桌面窗口。支持完整的 HTML、CSS 和 JavaScript，可以创建任意复杂的用户界面。支持丰富的窗口属性设置：菜单栏显示、置顶、任务栏显示、边框、大小调整、透明度、全屏等。HTML 内容可以是文件路径或直接的 HTML 字符串。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: '窗口标题',
                                default: '动态界面'
                            },
                            width: {
                                type: 'number',
                                description: '窗口宽度（像素）',
                                minimum: 200,
                                maximum: 2000,
                                default: 800
                            },
                            height: {
                                type: 'number',
                                description: '窗口高度（像素）',
                                minimum: 200,
                                maximum: 2000,
                                default: 600
                            },
                            // 窗口属性设置
                            showMenuBar: {
                                type: 'boolean',
                                description: '是否显示菜单栏',
                                default: false
                            },
                            alwaysOnTop: {
                                type: 'boolean',
                                description: '窗口是否始终置顶',
                                default: true
                            },
                            skipTaskbar: {
                                type: 'boolean',
                                description: '是否在任务栏隐藏窗口',
                                default: false
                            },
                            showInTaskbar: {
                                type: 'boolean',
                                description: '是否在任务栏显示窗口',
                                default: true
                            },
                            frame: {
                                type: 'boolean',
                                description: '是否显示窗口边框',
                                default: true
                            },
                            resizable: {
                                type: 'boolean',
                                description: '窗口是否可调整大小',
                                default: true
                            },
                            movable: {
                                type: 'boolean',
                                description: '窗口是否可移动',
                                default: true
                            },
                            minimizable: {
                                type: 'boolean',
                                description: '窗口是否可最小化',
                                default: true
                            },
                            maximizable: {
                                type: 'boolean',
                                description: '窗口是否可最大化',
                                default: true
                            },
                            closable: {
                                type: 'boolean',
                                description: '窗口是否可关闭',
                                default: true
                            },
                            minWidth: {
                                type: 'number',
                                description: '窗口最小宽度（像素）',
                                minimum: 200,
                                default: 400
                            },
                            minHeight: {
                                type: 'number',
                                description: '窗口最小高度（像素）',
                                minimum: 200,
                                default: 300
                            },
                            maxWidth: {
                                type: 'number',
                                description: '窗口最大宽度（像素）',
                                minimum: 400
                            },
                            maxHeight: {
                                type: 'number',
                                description: '窗口最大高度（像素）',
                                minimum: 300
                            },
                            opacity: {
                                type: 'number',
                                description: '窗口透明度（0.0-1.0）',
                                minimum: 0.0,
                                maximum: 1.0
                            },
                            fullscreen: {
                                type: 'boolean',
                                description: '是否全屏显示',
                                default: false
                            },
                            zoomFactor: {
                                type: 'number',
                                description: '窗口缩放因子',
                                minimum: 0.25,
                                maximum: 5.0,
                                default: 1.0
                            },
                            html: {
                                type: 'string',
                                description: 'HTML 内容输入，支持文件路径或 HTML 字符串。优先级：1. HTML 文件路径（如 ./index.html）2. HTML 字符串（如 <div>内容</div>）',
                                examples: {
                                    'HTML 文件路径': './templates/form.html',
                                    '相对路径': '../ui/dashboard.html',
                                    '绝对路径': '/Users/user/project/page.html',
                                    '简单 HTML 字符串': '<h1>Hello World</h1><p>这是一个简单的 HTML 界面</p>',
                                    '带样式的 HTML 字符串': '<div style="padding: 20px; background: #f0f0f0;"><h2>带样式的标题</h2><button onclick="alert(\'点击了按钮\')">点击我</button></div>',
                                    '复杂 HTML 字符串': '<div class="container"><form><label>姓名: <input type="text" name="name"></label><button type="submit">提交</button></form></div>'
                                }
                            },
                            data: {
                                type: 'object',
                                description: '界面初始数据，用于预填充表单字段和组件状态。键名应与组件的 name 属性对应',
                                additionalProperties: true,
                                examples: {
                                    'userName': '张三',
                                    'userAge': 25,
                                    'isActive': true,
                                    'selectedOption': 'option1'
                                },
                                default: {}
                            },
                            callbacks: {
                                type: 'object',
                                description: '事件回调函数映射，键为回调函数名称，值为 JavaScript 代码字符串。回调函数接收参数：data(全局数据)、sendResult(发送结果函数)、getFormData(获取表单数据函数)',
                                additionalProperties: {
                                    type: 'string',
                                    description: 'JavaScript 代码字符串，可以访问 data、sendResult、getFormData 参数'
                                },
                                examples: {
                                    'handleSubmit': 'sendResult({ action: "submit", formData: getFormData() });',
                                    'handleCancel': 'sendResult({ action: "cancel" });',
                                    'processData': 'const result = data.userInput * 2; sendResult({ processed: result });'
                                },
                                default: {}
                            },
                            reuseWindow: {
                                type: 'boolean',
                                description: '是否复用现有窗口而不是创建新窗口。当设置为 true 时，如果存在可用窗口，将更新现有窗口的内容和属性，而不是销毁并重新创建窗口。',
                                default: false
                            }
                        },
                        required: ['html'],
                        examples: [{
                                title: 'HTML 文件路径渲染',
                                description: '使用 HTML 文件路径渲染界面',
                                value: {
                                    title: 'HTML 文件界面',
                                    width: 800,
                                    height: 600,
                                    html: './templates/dashboard.html'
                                }
                            },
                            {
                                title: 'HTML 字符串渲染',
                                description: '使用 HTML 字符串直接渲染界面',
                                value: {
                                    title: 'HTML 字符串界面',
                                    width: 600,
                                    height: 400,
                                    html: '<div style="padding: 20px; font-family: Arial, sans-serif;"><h1 style="color: #333; text-align: center;">HTML 字符串渲染</h1><div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><h2>功能特点</h2><ul><li>支持完整的 HTML 语法</li><li>可以使用内联样式</li><li>支持 JavaScript 事件</li><li>完全自定义的界面布局</li></ul></div><button onclick="alert(\'HTML 按钮被点击了！\')" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">点击我</button></div>'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'start-notification-stream',
                    description: '开始发送定期通知',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            interval: {
                                type: 'number',
                                description: '通知间隔（毫秒）',
                                default: 1000
                            },
                            count: {
                                type: 'number',
                                description: '通知数量',
                                default: 10
                            }
                        }
                    }
                }
            ]
        };
    });

    // 处理工具调用
    server.setRequestHandler(CallToolRequestSchema, async(request) => {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'render-gui':
                    return await handleRenderDynamicGUI(args);



                case 'start-notification-stream':
                    return await handleStartNotificationStream(args, server);

                default:
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `未知工具: ${name}`
                    );
            }
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

// HTML 输入处理函数
function processHtmlInput(htmlInput) {
    if (!htmlInput || typeof htmlInput !== 'string') {
        throw new Error('HTML 输入不能为空且必须是字符串');
    }

    // 1. 优先判断是否是 HTML 文件地址
    if (isHtmlFilePath(htmlInput)) {
        console.log(`📁 检测到 HTML 文件路径: ${htmlInput}`);
        try {
            const resolvedPath = path.resolve(htmlInput);
            const htmlContent = fs.readFileSync(resolvedPath, 'utf8');
            console.log(`✅ 成功读取 HTML 文件，内容长度: ${htmlContent.length}`);
            return {
                type: 'file',
                path: htmlInput,
                content: htmlContent
            };
        } catch (error) {
            throw new Error(`读取 HTML 文件失败: ${error.message}`);
        }
    }
    
    // 2. 其次判断是否是 HTML 字符串
    if (isHtmlString(htmlInput)) {
        console.log(`📝 检测到 HTML 字符串，长度: ${htmlInput.length}`);
        return {
            type: 'string',
            content: htmlInput
        };
    }
    
    throw new Error('无效的 HTML 输入，必须是 HTML 文件路径或 HTML 字符串');
}

function isHtmlFilePath(input) {
    // 检查是否是文件路径格式
    return typeof input === 'string' && 
           (input.endsWith('.html') || 
            input.endsWith('.htm') ||
            input.includes('/') || 
            input.includes('\\')) &&
           !input.includes('<') && 
           !input.includes('>');
}

function isHtmlString(input) {
    // 检查是否包含 HTML 标签
    return typeof input === 'string' && 
           input.includes('<') && 
           input.includes('>');
}

// 处理动态 GUI 渲染
async function handleRenderDynamicGUI(args) {
    const {
        title = '动态界面',
            width = 800,
            height = 600,
            // 窗口属性设置
            showMenuBar = false,
            alwaysOnTop = true,
            skipTaskbar = false,
            showInTaskbar = true,
            frame = true,
            resizable = true,
            movable = true,
            minimizable = true,
            maximizable = true,
            closable = true,
            minWidth = 400,
            minHeight = 300,
            maxWidth,
            maxHeight,
            opacity,
            fullscreen = false,
            zoomFactor = 1.0,
            html = null,
            data = {},
            callbacks = {},
            reuseWindow = false
    } = args;

    console.log(`🎨 渲染动态 GUI: ${title}`);

    // 处理 HTML 输入（按优先级）
    let processedHtml = null;
    let inputType = 'none';
    
    if (html) {
        try {
            const result = processHtmlInput(html);
            processedHtml = result.content;
            inputType = result.type;
            
            if (result.type === 'file') {
                console.log(`📁 使用 HTML 文件: ${result.path}`);
            } else {
                console.log(`📝 使用 HTML 字符串，长度: ${processedHtml.length}`);
            }
        } catch (error) {
            throw new Error(`HTML 输入处理失败: ${error.message}`);
        }
    } else {
        throw new Error('缺少 html 参数，请提供 HTML 文件路径或 HTML 字符串');
    }

    // 验证窗口尺寸
    if (width < 200 || width > 2000) {
        throw new Error(`窗口宽度 ${width} 超出有效范围 (200-2000)`);
    }
    if (height < 200 || height > 2000) {
        throw new Error(`窗口高度 ${height} 超出有效范围 (200-2000)`);
    }

    // 验证回调函数
    if (callbacks && typeof callbacks === 'object') {
        Object.entries(callbacks).forEach(([name, code]) => {
            if (typeof code !== 'string') {
                throw new Error(`回调函数 "${name}" 必须是字符串类型`);
            }
            if (code.trim().length === 0) {
                throw new Error(`回调函数 "${name}" 不能为空`);
            }
        });
    }

    // 统一调用主进程创建窗口
    if (!global.createWindow) {
        // 如果在非 Electron 环境中运行，则抛出错误
        throw new Error('当前环境不支持窗口创建，请在 Electron 主进程中运行。');
    }

    try {
        console.log('🌐 MCP 调用窗口创建:', { title, width, height, inputType });

        await global.createWindow({
            type: 'dynamic',
            title,
            width,
            height,
            // 窗口属性设置
            showMenuBar,
            alwaysOnTop,
            skipTaskbar,
            showInTaskbar,
            frame,
            resizable,
            movable,
            minimizable,
            maximizable,
            closable,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            opacity,
            fullscreen,
            zoomFactor,
            html: processedHtml,
            data,
            callbacks,
            reuseWindow
        });

        console.log('✅ MCP 窗口创建成功');

        // 构建窗口属性信息
        const windowProps = [];
        if (showMenuBar) windowProps.push('显示菜单栏');
        if (alwaysOnTop) windowProps.push('始终置顶');
        if (skipTaskbar) windowProps.push('隐藏任务栏');
        if (!frame) windowProps.push('无边框');
        if (!resizable) windowProps.push('固定大小');
        if (fullscreen) windowProps.push('全屏');
        if (opacity !== undefined) windowProps.push(`透明度: ${opacity}`);
        if (zoomFactor !== 1.0) windowProps.push(`缩放: ${zoomFactor}`);

        const windowInfo = windowProps.length > 0 ? `\n🔧 窗口属性: ${windowProps.join(', ')}` : '';
        const reuseInfo = reuseWindow ? '\n🔄 已复用现有窗口' : '\n🆕 已创建新窗口';
        const inputInfo = inputType === 'file' ? '\n📁 HTML 来源: 文件路径' : '\n📝 HTML 来源: 字符串';

        return {
            content: [{
                type: 'text',
                text: `✅ 动态界面 "${title}" 已成功${reuseWindow ? '更新' : '创建并渲染'}\n📱 窗口尺寸: ${width}x${height}${inputInfo}\n📍 窗口已显示在屏幕中央${windowInfo}${reuseInfo}`
            }]
        };
    } catch (error) {
        console.error('❌ MCP 窗口创建失败:', error);
        throw new Error(`窗口创建失败: ${error.message}`);
    }
}



// 处理通知流
async function handleStartNotificationStream(args, server) {
    const { interval = 1000, count = 10 } = args;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let counter = 0;

    // 发送定期通知
    while (counter < count) {
        counter++;
        await sleep(interval);

        try {
            await server.notification({
                method: "notifications/message",
                params: {
                    level: "info",
                    data: `通知 #${counter} - ${new Date().toISOString()}`
                }
            });
        } catch (error) {
            console.error("发送通知时出错:", error);
        }
    }

    return {
        content: [{
            type: 'text',
            text: `✅ 已完成发送 ${count} 条通知，间隔 ${interval}ms`,
        }]
    };
}

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

// 创建服务器函数，供 Electron 集成使用
function createServer(port = 3001) {
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
            server: 'NexusGUI SSE MCP Server',
            version: '5.0.0',
            timestamp: new Date().toISOString(),
            sessions: Object.keys(transports).map(id => ({
                sessionId: id,
                isConnected: (transports[id] && transports[id].isConnected) || false
            }))
        };
        console.log(`🏥 健康检查:`, healthInfo);
        res.json(healthInfo);
    });

    // 调试端点：显示所有活动会话
    app.get('/debug/sessions', (req, res) => {
        const debugInfo = {
            totalSessions: Object.keys(transports).length,
            sessions: Object.keys(transports).map(id => ({
                sessionId: id,
                isConnected: (transports[id] && transports[id].isConnected) || false,
                hasSDKTransport: (transports[id] && transports[id].sdkTransport) || false,
                sessionIdFromTransport: (transports[id] && transports[id].sessionId) || null
            }))
        };
        console.log(`🐛 调试信息:`, debugInfo);
        res.json(debugInfo);
    });

    // 启动服务器
    const server = app.listen(port, (error) => {
        if (error) {
            console.error('❌ 启动服务器失败:', error);
            throw error;
        }
        console.log(`🚀 NexusGUI SSE MCP 服务器已启动，监听端口 ${port}`);
        console.log(`📡 SSE 端点: http://localhost:${port}/mcp`);
        console.log(`📨 消息端点: http://localhost:${port}/messages`);
        console.log(`🏥 健康检查: http://localhost:${port}/health`);
        console.log(`🐛 调试端点: http://localhost:${port}/debug/sessions`);
        console.log(`🌐 CORS 已启用，允许跨域请求`);
    });

    // 返回服务器实例和关闭函数
    return {
        server,
        close: async() => {
            console.log('正在关闭 SSE 服务器...');

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
    const { server } = createServer(process.env.PORT || 3001);

    // 处理服务器关闭
    process.on('SIGINT', async() => {
        console.log('正在关闭服务器...');
        server.close(() => {
            console.log('服务器关闭完成');
            process.exit(0);
        });
    });

    process.on('SIGTERM', async() => {
        console.log('正在关闭服务器...');
        server.close(() => {
            console.log('服务器关闭完成');
            process.exit(0);
        });
    });
}

module.exports = { createServer };