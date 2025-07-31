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