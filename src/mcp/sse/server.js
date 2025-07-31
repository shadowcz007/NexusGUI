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
        import ('./transport.js');
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
        version: '0.1.0',
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
                    description: '渲染动态 GUI 界面，支持多种组件类型和交互功能，以及丰富的窗口属性设置。支持组件类型：heading(标题)、text(文本)、input(输入框)、textarea(文本域)、select(选择框)、checkbox(复选框)、radio-group(单选组)、button(按钮)、image(图片)、divider(分割线)、container(容器)、link(链接)、progress(进度条)、tag(标签)、card(卡片)、chart(图表)。窗口属性包括：菜单栏显示、置顶、任务栏显示、边框、大小调整、透明度、全屏等。',
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
                            components: {
                                type: 'array',
                                description: 'GUI 组件数组，支持多种组件类型和嵌套结构',
                                items: {
                                    oneOf: [{
                                            type: 'object',
                                            title: '标题组件',
                                            properties: {
                                                type: { const: 'heading' },
                                                text: { type: 'string', description: '标题文本内容' },
                                                level: {
                                                    type: 'number',
                                                    description: '标题级别 (1-6)',
                                                    minimum: 1,
                                                    maximum: 6,
                                                    default: 2
                                                },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'text']
                                        },
                                        {
                                            type: 'object',
                                            title: '文本组件',
                                            properties: {
                                                type: { const: 'text' },
                                                text: { type: 'string', description: '文本内容' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'text']
                                        },
                                        {
                                            type: 'object',
                                            title: '输入框组件',
                                            properties: {
                                                type: { const: 'input' },
                                                label: { type: 'string', description: '标签文本' },
                                                name: { type: 'string', description: '字段名称，用于数据绑定' },
                                                inputType: {
                                                    type: 'string',
                                                    description: '输入类型',
                                                    enum: ['text', 'password', 'email', 'number', 'tel', 'url', 'date', 'time', 'datetime-local'],
                                                    default: 'text'
                                                },
                                                placeholder: { type: 'string', description: '占位符文本' },
                                                value: { type: 'string', description: '初始值' },
                                                required: { type: 'boolean', description: '是否必填', default: false },
                                                disabled: { type: 'boolean', description: '是否禁用', default: false },
                                                maxLength: { type: 'number', description: '最大长度' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'label']
                                        },
                                        {
                                            type: 'object',
                                            title: '文本域组件',
                                            properties: {
                                                type: { const: 'textarea' },
                                                label: { type: 'string', description: '标签文本' },
                                                name: { type: 'string', description: '字段名称' },
                                                rows: { type: 'number', description: '行数', default: 3 },
                                                placeholder: { type: 'string', description: '占位符文本' },
                                                value: { type: 'string', description: '初始值' },
                                                required: { type: 'boolean', description: '是否必填', default: false },
                                                disabled: { type: 'boolean', description: '是否禁用', default: false },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'label']
                                        },
                                        {
                                            type: 'object',
                                            title: '选择框组件',
                                            properties: {
                                                type: { const: 'select' },
                                                label: { type: 'string', description: '标签文本' },
                                                name: { type: 'string', description: '字段名称' },
                                                options: {
                                                    type: 'array',
                                                    description: '选项数组，可以是字符串或对象 {value, label, selected}',
                                                    items: {
                                                        oneOf: [
                                                            { type: 'string' },
                                                            {
                                                                type: 'object',
                                                                properties: {
                                                                    value: { type: 'string' },
                                                                    label: { type: 'string' },
                                                                    selected: { type: 'boolean' }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                },
                                                required: { type: 'boolean', description: '是否必填', default: false },
                                                disabled: { type: 'boolean', description: '是否禁用', default: false },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'label', 'options']
                                        },
                                        {
                                            type: 'object',
                                            title: '复选框组件',
                                            properties: {
                                                type: { const: 'checkbox' },
                                                label: { type: 'string', description: '标签文本' },
                                                name: { type: 'string', description: '字段名称' },
                                                checked: { type: 'boolean', description: '是否选中', default: false },
                                                disabled: { type: 'boolean', description: '是否禁用', default: false },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'label']
                                        },
                                        {
                                            type: 'object',
                                            title: '单选组组件',
                                            properties: {
                                                type: { const: 'radio-group' },
                                                label: { type: 'string', description: '组标签' },
                                                name: { type: 'string', description: '字段名称' },
                                                options: {
                                                    type: 'array',
                                                    description: '选项数组，可以是字符串或对象 {value, label, checked}',
                                                    items: {
                                                        oneOf: [
                                                            { type: 'string' },
                                                            {
                                                                type: 'object',
                                                                properties: {
                                                                    value: { type: 'string' },
                                                                    label: { type: 'string' },
                                                                    checked: { type: 'boolean' }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'label', 'options']
                                        },
                                        {
                                            type: 'object',
                                            title: '按钮组件',
                                            properties: {
                                                type: { const: 'button' },
                                                text: { type: 'string', description: '按钮文本' },
                                                onClick: { type: 'string', description: '点击事件回调函数名称' },
                                                className: {
                                                    type: 'string',
                                                    description: '按钮样式类',
                                                    enum: ['btn-primary', 'btn-secondary', 'btn-success', 'btn-danger', 'btn-warning', 'btn-info'],
                                                    default: 'btn-primary'
                                                },
                                                disabled: { type: 'boolean', description: '是否禁用', default: false }
                                            },
                                            required: ['type', 'text']
                                        },
                                        {
                                            type: 'object',
                                            title: '图片组件',
                                            properties: {
                                                type: { const: 'image' },
                                                src: { type: 'string', description: '图片源地址' },
                                                alt: { type: 'string', description: '替代文本' },
                                                width: { type: 'number', description: '图片宽度' },
                                                height: { type: 'number', description: '图片高度' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'src']
                                        },
                                        {
                                            type: 'object',
                                            title: '分割线组件',
                                            properties: {
                                                type: { const: 'divider' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type']
                                        },
                                        {
                                            type: 'object',
                                            title: '容器组件',
                                            properties: {
                                                type: { const: 'container' },
                                                children: {
                                                    type: 'array',
                                                    description: '子组件数组',
                                                    items: { type: 'object' }
                                                },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type']
                                        },
                                        {
                                            type: 'object',
                                            title: '链接组件',
                                            properties: {
                                                type: { const: 'link' },
                                                text: { type: 'string', description: '链接文本' },
                                                href: { type: 'string', description: '链接地址' },
                                                target: {
                                                    type: 'string',
                                                    description: '打开方式',
                                                    enum: ['_blank', '_self', '_parent', '_top'],
                                                    default: '_self'
                                                },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type', 'text', 'href']
                                        },
                                        {
                                            type: 'object',
                                            title: '进度条组件',
                                            properties: {
                                                type: { const: 'progress' },
                                                label: { type: 'string', description: '标签文本' },
                                                value: {
                                                    type: 'number',
                                                    description: '进度值 (0-100)',
                                                    minimum: 0,
                                                    maximum: 100,
                                                    default: 0
                                                },
                                                showValue: { type: 'boolean', description: '是否显示数值', default: false },
                                                fillClassName: { type: 'string', description: '进度条填充样式类' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type']
                                        },
                                        {
                                            type: 'object',
                                            title: '标签组件',
                                            properties: {
                                                type: { const: 'tag' },
                                                text: { type: 'string', description: '标签文本' },
                                                className: {
                                                    type: 'string',
                                                    description: '标签样式类',
                                                    enum: ['tag-default', 'tag-primary', 'tag-success', 'tag-warning', 'tag-danger'],
                                                    default: 'tag-default'
                                                }
                                            },
                                            required: ['type', 'text']
                                        },
                                        {
                                            type: 'object',
                                            title: '卡片组件',
                                            properties: {
                                                type: { const: 'card' },
                                                title: { type: 'string', description: '卡片标题' },
                                                content: { type: 'string', description: '卡片内容' },
                                                children: {
                                                    type: 'array',
                                                    description: '子组件数组',
                                                    items: { type: 'object' }
                                                },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type']
                                        },
                                        {
                                            type: 'object',
                                            title: '图表组件',
                                            properties: {
                                                type: { const: 'chart' },
                                                id: { type: 'string', description: '图表唯一标识' },
                                                chartType: {
                                                    type: 'string',
                                                    description: '图表类型',
                                                    enum: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
                                                    default: 'bar'
                                                },
                                                data: { type: 'object', description: '图表数据' },
                                                options: { type: 'object', description: '图表配置选项' },
                                                width: { type: 'string', description: '图表宽度', default: '100%' },
                                                height: { type: 'string', description: '图表高度', default: '400px' },
                                                className: { type: 'string', description: 'CSS 类名' }
                                            },
                                            required: ['type']
                                        }
                                    ]
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
                            }
                        },
                        required: ['components'],
                        examples: [{
                                title: '简单表单界面',
                                description: '创建一个包含输入框、选择框和按钮的表单',
                                value: {
                                    title: '用户信息表单',
                                    width: 600,
                                    height: 400,
                                    components: [
                                        { type: 'heading', text: '用户信息', level: 2 },
                                        { type: 'input', label: '姓名', name: 'userName', required: true },
                                        { type: 'input', label: '年龄', name: 'userAge', inputType: 'number' },
                                        { type: 'select', label: '性别', name: 'gender', options: ['男', '女'] },
                                        { type: 'button', text: '提交', onClick: 'handleSubmit' }
                                    ],
                                    callbacks: {
                                        'handleSubmit': 'sendResult({ action: "submit", data: getFormData() });'
                                    }
                                }
                            },
                            {
                                title: '数据展示界面',
                                description: '创建一个包含卡片、进度条和标签的数据展示界面',
                                value: {
                                    title: '数据统计',
                                    width: 800,
                                    height: 600,
                                    components: [
                                        { type: 'heading', text: '系统统计', level: 1 },
                                        { type: 'card', title: 'CPU 使用率', content: '当前系统 CPU 使用情况' },
                                        { type: 'progress', label: 'CPU 使用率', value: 75, showValue: true },
                                        { type: 'tag', text: '正常', className: 'tag-success' },
                                        { type: 'button', text: '刷新数据', onClick: 'refreshData' }
                                    ],
                                    callbacks: {
                                        'refreshData': 'sendResult({ action: "refresh" });'
                                    }
                                }
                            },
                            {
                                title: '高级窗口设置示例',
                                description: '创建一个带有高级窗口属性设置的界面',
                                value: {
                                    title: '高级设置界面',
                                    width: 600,
                                    height: 400,
                                    showMenuBar: true,
                                    alwaysOnTop: true,
                                    frame: false,
                                    resizable: false,
                                    opacity: 0.9,
                                    components: [
                                        { type: 'heading', text: '高级设置', level: 1 },
                                        { type: 'text', text: '这是一个带有特殊窗口属性的界面示例', className: 'text-gray-600 mb-4' },
                                        { type: 'card', title: '窗口属性', content: '无边框、置顶、半透明、固定大小' },
                                        { type: 'button', text: '关闭', onClick: 'closeWindow' }
                                    ],
                                    callbacks: {
                                        'closeWindow': 'sendResult({ action: "close" });'
                                    }
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
                case 'render-dynamic-gui':
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

// 处理动态 GUI 渲染
async function handleRenderDynamicGUI(args) {
    const {
        title = '动态界面',
            width = 800,
            height = 600,
            // 窗口属性设置
            showMenuBar = false,
            alwaysOnTop = false,
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
            components = [],
            data = {},
            callbacks = {}
    } = args;

    console.log(`🎨 渲染动态 GUI: ${title}`);
    console.log(`📊 组件数量: ${components.length}`);

    // 验证窗口尺寸
    if (width < 200 || width > 2000) {
        throw new Error(`窗口宽度 ${width} 超出有效范围 (200-2000)`);
    }
    if (height < 200 || height > 2000) {
        throw new Error(`窗口高度 ${height} 超出有效范围 (200-2000)`);
    }

    // 验证组件定义
    try {
        const validTypes = [
            'heading', 'text', 'input', 'textarea', 'select',
            'checkbox', 'radio-group', 'button', 'image', 'divider',
            'container', 'link', 'progress', 'tag', 'card', 'chart'
        ];

        components.forEach((comp, index) => {
            if (!comp || typeof comp !== 'object') {
                throw new Error(`组件 ${index} 不是有效的对象`);
            }

            if (!comp.type) {
                throw new Error(`组件 ${index} 缺少 type 属性`);
            }

            if (!validTypes.includes(comp.type)) {
                throw new Error(`组件 ${index} 的 type "${comp.type}" 不是有效的组件类型。支持的类型: ${validTypes.join(', ')}`);
            }

            // 根据组件类型验证必需属性
            switch (comp.type) {
                case 'heading':
                    if (!comp.text) {
                        throw new Error(`组件 ${index} (heading) 缺少必需的 text 属性`);
                    }
                    if (comp.level && (comp.level < 1 || comp.level > 6)) {
                        throw new Error(`组件 ${index} (heading) 的 level 属性必须在 1-6 之间`);
                    }
                    break;

                case 'text':
                    if (!comp.text) {
                        throw new Error(`组件 ${index} (text) 缺少必需的 text 属性`);
                    }
                    break;

                case 'input':
                    if (!comp.label) {
                        throw new Error(`组件 ${index} (input) 缺少必需的 label 属性`);
                    }
                    if (comp.inputType && !['text', 'password', 'email', 'number', 'tel', 'url', 'date', 'time', 'datetime-local'].includes(comp.inputType)) {
                        throw new Error(`组件 ${index} (input) 的 inputType "${comp.inputType}" 不是有效的输入类型`);
                    }
                    break;

                case 'textarea':
                    if (!comp.label) {
                        throw new Error(`组件 ${index} (textarea) 缺少必需的 label 属性`);
                    }
                    if (comp.rows && (comp.rows < 1 || comp.rows > 20)) {
                        throw new Error(`组件 ${index} (textarea) 的 rows 属性必须在 1-20 之间`);
                    }
                    break;

                case 'select':
                    if (!comp.label) {
                        throw new Error(`组件 ${index} (select) 缺少必需的 label 属性`);
                    }
                    if (!comp.options || !Array.isArray(comp.options) || comp.options.length === 0) {
                        throw new Error(`组件 ${index} (select) 缺少必需的 options 属性或选项为空`);
                    }
                    break;

                case 'checkbox':
                    if (!comp.label) {
                        throw new Error(`组件 ${index} (checkbox) 缺少必需的 label 属性`);
                    }
                    break;

                case 'radio-group':
                    if (!comp.label) {
                        throw new Error(`组件 ${index} (radio-group) 缺少必需的 label 属性`);
                    }
                    if (!comp.options || !Array.isArray(comp.options) || comp.options.length === 0) {
                        throw new Error(`组件 ${index} (radio-group) 缺少必需的 options 属性或选项为空`);
                    }
                    break;

                case 'button':
                    if (!comp.text) {
                        throw new Error(`组件 ${index} (button) 缺少必需的 text 属性`);
                    }
                    if (comp.className && !['btn-primary', 'btn-secondary', 'btn-success', 'btn-danger', 'btn-warning', 'btn-info'].includes(comp.className)) {
                        throw new Error(`组件 ${index} (button) 的 className "${comp.className}" 不是有效的按钮样式类`);
                    }
                    break;

                case 'image':
                    if (!comp.src) {
                        throw new Error(`组件 ${index} (image) 缺少必需的 src 属性`);
                    }
                    break;

                case 'link':
                    if (!comp.text) {
                        throw new Error(`组件 ${index} (link) 缺少必需的 text 属性`);
                    }
                    if (!comp.href) {
                        throw new Error(`组件 ${index} (link) 缺少必需的 href 属性`);
                    }
                    if (comp.target && !['_blank', '_self', '_parent', '_top'].includes(comp.target)) {
                        throw new Error(`组件 ${index} (link) 的 target "${comp.target}" 不是有效的目标值`);
                    }
                    break;

                case 'progress':
                    if (comp.value !== undefined && (comp.value < 0 || comp.value > 100)) {
                        throw new Error(`组件 ${index} (progress) 的 value 属性必须在 0-100 之间`);
                    }
                    break;

                case 'tag':
                    if (!comp.text) {
                        throw new Error(`组件 ${index} (tag) 缺少必需的 text 属性`);
                    }
                    if (comp.className && !['tag-default', 'tag-primary', 'tag-success', 'tag-warning', 'tag-danger'].includes(comp.className)) {
                        throw new Error(`组件 ${index} (tag) 的 className "${comp.className}" 不是有效的标签样式类`);
                    }
                    break;

                case 'chart':
                    if (comp.chartType && !['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'].includes(comp.chartType)) {
                        throw new Error(`组件 ${index} (chart) 的 chartType "${comp.chartType}" 不是有效的图表类型`);
                    }
                    break;

                case 'container':
                    // 容器组件可以没有子组件，但如果有子组件，需要递归验证
                    if (comp.children && Array.isArray(comp.children)) {
                        comp.children.forEach((childComp, childIndex) => {
                            if (!childComp.type) {
                                throw new Error(`容器组件 ${index} 的子组件 ${childIndex} 缺少 type 属性`);
                            }
                        });
                    }
                    break;

                case 'card':
                    // 卡片组件可以没有子组件，但如果有子组件，需要递归验证
                    if (comp.children && Array.isArray(comp.children)) {
                        comp.children.forEach((childComp, childIndex) => {
                            if (!childComp.type) {
                                throw new Error(`卡片组件 ${index} 的子组件 ${childIndex} 缺少 type 属性`);
                            }
                        });
                    }
                    break;

                case 'divider':
                    // 分割线组件不需要额外验证
                    break;
            }
        });

        console.log('✅ 组件验证通过');
    } catch (error) {
        throw new Error(`组件验证失败: ${error.message}`);
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
        console.log('🌐 MCP 调用窗口创建:', { title, width, height, componentsCount: components.length });

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
            components,
            data,
            callbacks
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

        return {
            content: [{
                type: 'text',
                text: `✅ 动态界面 "${title}" 已成功创建并渲染\n📱 窗口尺寸: ${width}x${height}\n🧩 组件数量: ${components.length}\n📍 窗口已显示在屏幕中央${windowInfo}`
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