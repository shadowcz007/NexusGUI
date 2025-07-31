// NexusGUI MCP 服务器
// 提供 render-dynamic-gui 工具，接收 AI 生成的 GUI 定义

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

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

// 创建 MCP 服务器
const server = new Server({
    name: 'nexusgui-server',
    version: '5.0.0',
}, {
    capabilities: {
        tools: {},
    },
});

// 注册工具：render-dynamic-gui
server.setRequestHandler(ListToolsRequestSchema, async() => {
    return {
        tools: [{
            name: 'render-dynamic-gui',
            description: '渲染动态 GUI 界面，支持多种组件类型和交互功能。支持组件类型：heading(标题)、text(文本)、input(输入框)、textarea(文本域)、select(选择框)、checkbox(复选框)、radio-group(单选组)、button(按钮)、image(图片)、divider(分割线)、container(容器)、link(链接)、progress(进度条)、tag(标签)、card(卡片)、chart(图表)',
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
                        description: '界面初始数据，用于预填充表单字段和组件状态。键名应与组件的 name 属性对应。示例：{"userName": "张三", "userAge": 25, "isActive": true, "selectedOption": "option1"}',
                        default: {}
                    },
                    callbacks: {
                        type: 'object',
                        description: '事件回调函数映射，键为回调函数名称，值为 JavaScript 代码字符串。回调函数接收参数：data(全局数据)、sendResult(发送结果函数)、getFormData(获取表单数据函数)',
                        additionalProperties: {
                            type: 'string',
                            description: 'JavaScript 代码字符串，可以访问 data、sendResult、getFormData 参数'
                        },
                        default: {}
                    }
                },
                required: ['components']
            }
        }]
    };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async(request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'render-dynamic-gui':
                return await handleRenderDynamicGUI(args);

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

    // 调用主进程创建窗口
    if (global.createWindow) {
        try {
            await global.createWindow({
                type: 'dynamic',
                title,
                width,
                height,
                components,
                data,
                callbacks
            });

            return {
                content: [{
                    type: 'text',
                    text: `✅ 动态界面 "${title}" 已成功渲染\n📱 窗口尺寸: ${width}x${height}\n🧩 组件数量: ${components.length}`
                }]
            };
        } catch (error) {
            throw new Error(`窗口创建失败: ${error.message}`);
        }
    } else {
        throw new Error('主进程 createWindow 函数不可用');
    }
}



// 启动 MCP 服务器
async function startMCPServer() {
    const transport = new StdioServerTransport();

    // 连接服务器和传输层
    await server.connect(transport);

    console.log('🚀 NexusGUI MCP 服务器已启动');
    console.log('📡 等待 AI 客户端连接...');

    return server;
}

// 优雅关闭
process.on('SIGINT', async() => {
    console.log('🛑 正在关闭 MCP 服务器...');
    await server.close();
    process.exit(0);
});

process.on('SIGTERM', async() => {
    console.log('🛑 正在关闭 MCP 服务器...');
    await server.close();
    process.exit(0);
});

export { startMCPServer, server };