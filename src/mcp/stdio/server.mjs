// NexusGUI MCP 服务器
// 提供 render-gui 工具，接收 AI 生成的 GUI 定义

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ES模块中的 __dirname 替代方案）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 获取项目信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));

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

// 创建 MCP 服务器
const server = new Server({
    name: `${packageJson.name}-server`,
    version: packageJson.version,
}, {
    capabilities: {
        tools: {},
    },
});

// 注册工具：render-gui
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: 'render-gui',
            description: '渲染动态 GUI 界面，支持 HTML 文件路径和 HTML 字符串输入。优先级：1. HTML 文件路径 2. HTML 字符串',
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
                    }
                },
                required: ['html']
            }
        }]
    };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'render-gui':
                return await handleRenderGUI(args);

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

// 处理 GUI 渲染
async function handleRenderGUI(args) {
    const {
        title = '动态界面',
        width = 800,
        height = 600,
        html = null,
        data = {},
        callbacks = {}
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

    // 调用主进程创建窗口
    if (global.createWindow) {
        try {
            console.log('🌐 MCP 调用窗口创建:', { title, width, height, inputType });

            await global.createWindow({
                type: 'dynamic',
                title,
                width,
                height,
                html: processedHtml,
                data,
                callbacks
            });

            console.log('✅ MCP 窗口创建成功');

            const inputInfo = inputType === 'file' ? '\n📁 HTML 来源: 文件路径' : '\n📝 HTML 来源: 字符串';

            return {
                content: [{
                    type: 'text',
                    text: `✅ 动态界面 "${title}" 已成功创建并渲染\n📱 窗口尺寸: ${width}x${height}${inputInfo}\n📍 窗口已显示在屏幕中央`
                }]
            };
        } catch (error) {
            console.error('❌ MCP 窗口创建失败:', error);
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

    console.log(`🚀 ${packageJson.build?.productName || packageJson.name || 'NexusGUI'} MCP 服务器已启动`);
    console.log('📡 等待 AI 客户端连接...');

    return server;
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('🛑 正在关闭 MCP 服务器...');
    await server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 正在关闭 MCP 服务器...');
    await server.close();
    process.exit(0);
});

export { startMCPServer, server };