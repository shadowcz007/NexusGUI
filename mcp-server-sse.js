const express = require('express');
const cors = require('cors');
const { z } = require('zod');

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
        import ('./sse-transport.js');
        SSEServerTransport = sseTransport.SSEServerTransport;
    }
}

// GUI 组件定义 Schema
const ComponentSchema = z.object({
    type: z.string().describe('组件类型'),
    id: z.string().optional().describe('组件ID'),
    className: z.string().optional().describe('CSS类名'),
    style: z.record(z.any()).optional().describe('内联样式'),
    attributes: z.record(z.string()).optional().describe('HTML属性'),
    dataset: z.record(z.string()).optional().describe('数据属性'),
    // 基础组件属性
    text: z.string().optional().describe('文本内容'),
    level: z.number().optional().describe('标题级别'),
    src: z.string().optional().describe('图片源'),
    alt: z.string().optional().describe('图片替代文本'),
    href: z.string().optional().describe('链接地址'),
    target: z.string().optional().describe('链接目标'),
    // 表单组件属性
    label: z.string().optional().describe('标签文本'),
    name: z.string().optional().describe('表单字段名'),
    placeholder: z.string().optional().describe('占位符'),
    required: z.boolean().optional().describe('是否必填'),
    disabled: z.boolean().optional().describe('是否禁用'),
    inputType: z.string().optional().describe('输入框类型'),
    rows: z.number().optional().describe('文本区域行数'),
    maxLength: z.number().optional().describe('最大长度'),
    checked: z.boolean().optional().describe('是否选中'),
    options: z.array(z.any()).optional().describe('选项列表'),
    // 扩展组件属性
    value: z.number().optional().describe('进度值'),
    showValue: z.boolean().optional().describe('是否显示数值'),
    fillClassName: z.string().optional().describe('填充样式'),
    title: z.string().optional().describe('卡片标题'),
    content: z.string().optional().describe('卡片内容'),
    onClick: z.string().optional().describe('点击事件回调名'),
    // 容器组件
    children: z.array(z.lazy(() => ComponentSchema)).optional().describe('子组件'),
    // 图表组件
    chartType: z.string().optional().describe('图表类型'),
    data: z.any().optional().describe('图表数据'),
    options: z.any().optional().describe('图表选项'),
    width: z.string().optional().describe('宽度'),
    height: z.string().optional().describe('高度')
});

/**
 * 创建 MCP 服务器实例
 */
const getServer = async() => {
    await initializeModules();

    const server = new Server({
        name: 'nexusgui-sse-server',
        version: '5.0.0',
    }, {
        capabilities: {
            tools: {},
            logging: {},
        },
    });

    // 注册工具：render-dynamic-gui
    server.setRequestHandler(ListToolsRequestSchema, async() => {
        return {
            tools: [{
                    name: 'render-dynamic-gui',
                    description: '渲染动态 GUI 界面，接收 AI 生成的组件定义并在桌面端展示',
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
                                description: '窗口宽度',
                                default: 800
                            },
                            height: {
                                type: 'number',
                                description: '窗口高度',
                                default: 600
                            },
                            components: {
                                type: 'array',
                                description: 'GUI 组件数组，使用 NexusGUI 组件格式',
                                items: {
                                    type: 'object',
                                    description: '组件定义对象'
                                }
                            },
                            data: {
                                type: 'object',
                                description: '界面初始数据',
                                default: {}
                            },
                            callbacks: {
                                type: 'object',
                                description: '事件回调函数字符串映射',
                                additionalProperties: {
                                    type: 'string'
                                },
                                default: {}
                            }
                        },
                        required: ['components']
                    }
                },
                {
                    name: 'create-form-gui',
                    description: '快速创建表单界面的便捷工具',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: '表单标题',
                                default: '表单'
                            },
                            fields: {
                                type: 'array',
                                description: '表单字段定义',
                                items: {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['input', 'textarea', 'select', 'checkbox', 'radio-group'],
                                            description: '字段类型'
                                        },
                                        name: {
                                            type: 'string',
                                            description: '字段名称'
                                        },
                                        label: {
                                            type: 'string',
                                            description: '字段标签'
                                        },
                                        required: {
                                            type: 'boolean',
                                            description: '是否必填',
                                            default: false
                                        },
                                        placeholder: {
                                            type: 'string',
                                            description: '占位符'
                                        },
                                        options: {
                                            type: 'array',
                                            description: '选项（用于 select 和 radio-group）'
                                        }
                                    },
                                    required: ['type', 'name', 'label']
                                }
                            },
                            submitText: {
                                type: 'string',
                                description: '提交按钮文本',
                                default: '提交'
                            },
                            onSubmit: {
                                type: 'string',
                                description: '提交回调函数代码',
                                default: 'const formData = getFormData(); sendResult({ type: "form-submit", data: formData });'
                            }
                        },
                        required: ['fields']
                    }
                },
                {
                    name: 'create-dialog-gui',
                    description: '创建对话框界面',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: '对话框标题',
                                default: '确认'
                            },
                            message: {
                                type: 'string',
                                description: '对话框消息',
                                required: true
                            },
                            type: {
                                type: 'string',
                                enum: ['info', 'warning', 'error', 'confirm'],
                                description: '对话框类型',
                                default: 'info'
                            },
                            buttons: {
                                type: 'array',
                                description: '按钮配置',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        action: { type: 'string' },
                                        className: { type: 'string' }
                                    }
                                },
                                default: [{ text: '确定', action: 'confirm', className: 'btn-primary' }]
                            }
                        },
                        required: ['message']
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
                case 'render-dynamic-gui':
                    return await handleRenderDynamicGUI(args);

                case 'create-form-gui':
                    return await handleCreateFormGUI(args);

                case 'create-dialog-gui':
                    return await handleCreateDialogGUI(args);

                case 'start-notification-stream':
                    return await handleStartNotificationStream(args, request);

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

// 处理动态 GUI 渲染
async function handleRenderDynamicGUI(args) {
    const {
        title = '动态界面',
            width = 800,
            height = 600,
            components = [],
            data = {},
            callbacks = {}
    } = args;

    console.log(`🎨 渲染动态 GUI: ${title}`);
    console.log(`📊 组件数量: ${components.length}`);

    // 验证组件定义
    try {
        components.forEach((comp, index) => {
            if (!comp.type) {
                throw new Error(`组件 ${index} 缺少 type 属性`);
            }
        });
    } catch (error) {
        throw new Error(`组件验证失败: ${error.message}`);
    }

    // 统一调用主进程创建窗口
    if (!global.createWindow) {
        // 如果在非 Electron 环境中运行，则抛出错误
        throw new Error('当前环境不支持窗口创建，请在 Electron 主进程中运行。');
    }

    try {
        console.log('🌐 MCP 调用窗口创建:', { title, width, height, componentsCount: components.length });

        await global.createWindow({
            type: 'dynamic',
            title,
            width,
            height,
            components,
            data,
            callbacks
        });

        console.log('✅ MCP 窗口创建成功');

        return {
            content: [{
                type: 'text',
                text: `✅ 动态界面 "${title}" 已成功创建并渲染\n📱 窗口尺寸: ${width}x${height}\n🧩 组件数量: ${components.length}\n📍 窗口已显示在屏幕中央`
            }]
        };
    } catch (error) {
        console.error('❌ MCP 窗口创建失败:', error);
        throw new Error(`窗口创建失败: ${error.message}`);
    }
}

// 处理表单 GUI 创建
async function handleCreateFormGUI(args) {
    const {
        title = '表单',
            fields = [],
            submitText = '提交',
            onSubmit = 'const formData = getFormData(); sendResult({ type: "form-submit", data: formData });'
    } = args;

    // 构建表单组件
    const components = [{
            type: 'heading',
            text: title,
            level: 2,
            className: 'mb-6 text-xl font-bold'
        },
        {
            type: 'container',
            className: 'form-container',
            children: [
                ...fields.map(field => ({
                    type: field.type,
                    name: field.name,
                    label: field.label,
                    required: field.required || false,
                    placeholder: field.placeholder,
                    options: field.options,
                    className: 'mb-4'
                })),
                {
                    type: 'button',
                    text: submitText,
                    onClick: 'submitForm',
                    className: 'w-full btn-primary mt-4'
                }
            ]
        }
    ];

    const callbacks = {
        submitForm: onSubmit
    };

    return await handleRenderDynamicGUI({
        title: `${title} - 表单`,
        width: 500,
        height: Math.min(800, 300 + fields.length * 80),
        components,
        callbacks
    });
}

// 处理对话框 GUI 创建
async function handleCreateDialogGUI(args) {
    const {
        title = '确认',
            message,
            type = 'info',
            buttons = [{ text: '确定', action: 'confirm', className: 'btn-primary' }]
    } = args;

    // 根据类型选择图标和样式
    const typeConfig = {
        info: { icon: 'ℹ️', className: 'text-blue-600' },
        warning: { icon: '⚠️', className: 'text-yellow-600' },
        error: { icon: '❌', className: 'text-red-600' },
        confirm: { icon: '❓', className: 'text-gray-600' }
    };

    const config = typeConfig[type] || typeConfig.info;

    const components = [{
        type: 'container',
        className: 'dialog-container text-center p-6',
        children: [{
                type: 'text',
                text: config.icon,
                className: 'text-4xl mb-4'
            },
            {
                type: 'heading',
                text: title,
                level: 3,
                className: `mb-4 ${config.className}`
            },
            {
                type: 'text',
                text: message,
                className: 'mb-6 text-gray-700'
            },
            {
                type: 'container',
                className: 'flex justify-center space-x-3',
                children: buttons.map((btn, index) => ({
                    type: 'button',
                    text: btn.text,
                    onClick: `dialogAction_${index}`,
                    className: btn.className || 'btn-secondary'
                }))
            }
        ]
    }];

    const callbacks = {};
    buttons.forEach((btn, index) => {
        callbacks[`dialogAction_${index}`] = `sendResult({ type: 'dialog-action', action: '${btn.action}', button: '${btn.text}' }); window.close();`;
    });

    return await handleRenderDynamicGUI({
        title,
        width: 400,
        height: 250,
        components,
        callbacks
    });
}

// 处理通知流
async function handleStartNotificationStream(args, request) {
    const { interval = 1000, count = 10 } = args;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let counter = 0;

    // 发送初始通知
    if (request.sendNotification) {
        await request.sendNotification({
            method: "notifications/message",
            params: {
                level: "info",
                data: `开始通知流，每 ${interval}ms 发送 ${count} 条消息`
            }
        });
    }

    // 发送定期通知
    while (counter < count) {
        counter++;
        await sleep(interval);

        try {
            if (request.sendNotification) {
                await request.sendNotification({
                    method: "notifications/message",
                    params: {
                        level: "info",
                        data: `通知 #${counter} - ${new Date().toISOString()}`
                    }
                });
            }
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
                isConnected: transports[id]?.isConnected || false
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
                isConnected: transports[id]?.isConnected || false,
                hasSDKTransport: !!transports[id]?.sdkTransport,
                sessionIdFromTransport: transports[id]?.sessionId || null
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