const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// 读取 package.json 获取项目信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));

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
        name: `${packageJson.name}-sse-server`,
        version: packageJson.version,
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
                    description: [
                        `渲染 HTML 界面到桌面窗口。`,
                        `支持完整的 HTML、CSS 和 JavaScript，可以创建任意复杂的用户界面。`,
                        `支持丰富的窗口属性设置：菜单栏显示、置顶、任务栏显示、边框、大小调整、透明度、全屏等。`,
                        `可根据需要控制否是同步等待窗口结果`,
                        `HTML 内容可以是文件路径或直接的 HTML 字符串。`,
                        `可使用的electronAPI={`,
                        `"sendResult":function(result){}, //用于同步等待结果`,
                        `}`
                    ].join('\n'),
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: '窗口标题',
                                default: '动态界面'
                            },
                            waitForResult: {
                                type: 'boolean',
                                description: '是否同步等待窗口结果。当设置为 true 时，函数将阻塞直到窗口关闭或提交结果。',
                                default: false
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
          "type": "boolean",
          "description": "是否复用现有窗口而不是创建新窗口。当设置为 true 时，如果存在可用窗口，将更新现有窗口的内容和属性，而不是销毁并重新创建窗口。",
          "default": false
        },
        waitForResult: {
          "type": "boolean",
          "description": "是否同步等待窗口结果。当设置为 true 时，函数将阻塞直到窗口关闭或提交结果。",
          "default": false
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
            reuseWindow = false,
            waitForResult = false // 新增参数：是否等待结果
    } = args;

    console.log(`🎨 渲染动态 GUI: ${title}${waitForResult ? ' (同步等待结果)' : ''}`);

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
        console.log('🌐 MCP 调用窗口创建:', { title, width, height, inputType, waitForResult });

        // 创建窗口配置
        const windowConfig = {
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
            reuseWindow,
            waitForResult // 传递等待结果参数
        };

        // 根据 waitForResult 参数决定是否等待结果
        if (waitForResult) {
            // 同步等待窗口结果
            const result = await global.createWindow(windowConfig);
            
            console.log('✅ MCP 窗口操作完成，结果:', result);

            // 返回窗口操作结果
            return {
                content: [{
                    type: 'text',
                    text: `✅ 动态界面 "${title}" 操作已完成\n📱 窗口尺寸: ${width}x${height}\n📍 操作结果: ${result.action || '关闭'}\n📄 返回数据: ${JSON.stringify(result.data || {})}`
                }],
                result: result // 将窗口操作结果包含在返回值中
            };
        } else {
            // 异步创建窗口（原有行为）
            await global.createWindow(windowConfig);
            
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
        }
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