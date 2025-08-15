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

// 内容输入处理函数（新格式）
function processContentInput(type, content) {
    if (!type || !content) {
        throw new Error('type 和 content 参数都不能为空');
    }

    if (typeof type !== 'string' || typeof content !== 'string') {
        throw new Error('type 和 content 必须是字符串类型');
    }

    const validTypes = ['html', 'url', 'markdown', 'image', 'auto'];
    if (!validTypes.includes(type)) {
        throw new Error(`无效的 type 值: ${type}，必须是 ${validTypes.join(', ')} 之一`);
    }

    switch (type) {
        case 'html':
            return processHtmlContent(content);

        case 'url':
            return processUrlContent(content);

        case 'markdown':
            return processMarkdownContent(content);

        case 'image':
            return processImageContent(content);

        case 'auto':
            // auto 类型需要异步处理，在 stdio 服务器中暂时回退到 html 处理
            console.warn('警告: stdio 服务器中的 auto 类型暂时回退到 html 处理');
            return processHtmlContent(content);

        default:
            throw new Error(`不支持的内容类型: ${type}`);
    }
}

// 处理 HTML 内容
function processHtmlContent(htmlContent) {
    if (!isHtmlString(htmlContent)) {
        throw new Error('提供的内容不是有效的 HTML 字符串');
    }

    console.log(`📝 处理 HTML 字符串，长度: ${htmlContent.length}`);
    return {
        type: 'html',
        originalType: 'html',
        content: htmlContent
    };
}

// 处理 URL 内容（文件路径或网络 URL）
function processUrlContent(urlContent) {
    // 检查是否是网络 URL
    if (isNetworkUrl(urlContent)) {
        console.log(`🌐 检测到网络 URL: ${urlContent}`);
        // 对于网络 URL，直接返回 URL，让窗口直接加载，避免 iframe 和 CSP 错误
        // 这样可以让网站在 Electron 窗口中正常显示，而不是被 CSP 策略阻止
        return {
            type: 'url',
            originalType: 'url',
            subType: 'network',
            url: urlContent,
            content: urlContent, // 直接返回 URL 而不是包含 iframe 的 HTML
            directUrl: true // 标识这是一个需要直接加载的 URL
        };
    }

    // 检查是否是本地文件路径
    if (isLocalFilePath(urlContent)) {
        console.log(`📁 检测到本地文件路径: ${urlContent}`);
        try {
            const resolvedPath = path.resolve(urlContent);
            const fileContent = fs.readFileSync(resolvedPath, 'utf8');
            const fileExt = path.extname(urlContent).toLowerCase();

            // 根据文件扩展名处理不同类型的文件
            if (['.html', '.htm'].includes(fileExt)) {
                console.log(`✅ 成功读取 HTML 文件，内容长度: ${fileContent.length}`);
                return {
                    type: 'url',
                    originalType: 'url',
                    subType: 'html-file',
                    path: urlContent,
                    content: fileContent
                };
            } else if (['.md', '.markdown'].includes(fileExt)) {
                console.log(`✅ 成功读取 Markdown 文件，内容长度: ${fileContent.length}`);
                // 将 Markdown 转换为 HTML
                const htmlContent = convertMarkdownToHtml(fileContent);
                return {
                    type: 'url',
                    originalType: 'url',
                    subType: 'markdown-file',
                    path: urlContent,
                    content: htmlContent
                };
            } else {
                // 对于其他文件类型，尝试作为文本显示
                console.log(`✅ 成功读取文本文件，内容长度: ${fileContent.length}`);
                const textHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>文件内容 - ${path.basename(urlContent)}</title>
                        <style>
                            body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                            pre { background: white; padding: 15px; border-radius: 5px; overflow: auto; }
                        </style>
                    </head>
                    <body>
                        <h2>文件: ${path.basename(urlContent)}</h2>
                        <pre>${escapeHtml(fileContent)}</pre>
                    </body>
                    </html>
                `;
                return {
                    type: 'url',
                    originalType: 'url',
                    subType: 'text-file',
                    path: urlContent,
                    content: textHtml
                };
            }
        } catch (error) {
            throw new Error(`读取文件失败: ${error.message}`);
        }
    }

    throw new Error('无效的 URL 内容，必须是有效的网络 URL 或本地文件路径');
}

// 处理 Markdown 内容
function processMarkdownContent(markdownContent) {
    console.log(`📄 处理 Markdown 内容，长度: ${markdownContent.length}`);

    // 将 Markdown 转换为 HTML
    const htmlContent = convertMarkdownToHtml(markdownContent);

    return {
        type: 'markdown',
        originalType: 'markdown',
        content: htmlContent
    };
}

// 处理图片内容
function processImageContent(imageContent) {
    // 检查是否是 base64 数据
    if (isBase64Image(imageContent)) {
        console.log(`🖼️ 检测到 base64 图片数据`);
        const imageHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>图片查看器</title>
                <style>
                    body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                    img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                <img src="${imageContent}" alt="Base64 图片" />
            </body>
            </html>
        `;
        return {
            type: 'image',
            originalType: 'image',
            subType: 'base64',
            content: imageHtml
        };
    }

    // 检查是否是图片文件路径
    if (isImageFilePath(imageContent)) {
        console.log(`🖼️ 检测到图片文件路径: ${imageContent}`);
        try {
            const resolvedPath = path.resolve(imageContent);
            // 检查文件是否存在
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`图片文件不存在: ${resolvedPath}`);
            }

            const imageHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>图片查看器 - ${path.basename(imageContent)}</title>
                    <style>
                        body { margin: 0; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                        h2 { color: #333; margin-bottom: 20px; }
                        img { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <h2>${path.basename(imageContent)}</h2>
                    <img src="file://${resolvedPath}" alt="${path.basename(imageContent)}" />
                </body>
                </html>
            `;
            return {
                type: 'image',
                originalType: 'image',
                subType: 'file',
                path: imageContent,
                content: imageHtml
            };
        } catch (error) {
            throw new Error(`处理图片文件失败: ${error.message}`);
        }
    }

    throw new Error('无效的图片内容，必须是图片文件路径或 base64 数据');
}



function isHtmlString(input) {
    // 检查是否包含 HTML 标签
    return typeof input === 'string' &&
        input.includes('<') &&
        input.includes('>');
}

// 检查是否是网络 URL
function isNetworkUrl(input) {
    try {
        const url = new URL(input);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}

// 检查是否是本地文件路径
function isLocalFilePath(input) {
    return typeof input === 'string' &&
        (input.includes('/') || input.includes('\\') || input.includes('.')) &&
        !isNetworkUrl(input) &&
        !input.includes('<') &&
        !input.includes('>');
}

// 检查是否是图片文件路径
function isImageFilePath(input) {
    if (!isLocalFilePath(input)) {
        return false;
    }
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    const ext = path.extname(input).toLowerCase();
    return imageExtensions.includes(ext);
}

// 检查是否是 base64 图片数据
function isBase64Image(input) {
    return typeof input === 'string' &&
        input.startsWith('data:image/') &&
        input.includes('base64,');
}

// 转义 HTML 特殊字符
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// 将 Markdown 转换为 HTML（简单实现）
function convertMarkdownToHtml(markdown) {
    // 这是一个简单的 Markdown 转 HTML 实现
    // 在实际项目中，建议使用专业的 Markdown 解析库如 marked 或 markdown-it

    let html = markdown
        // 标题
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')

        // 粗体和斜体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

        // 代码块
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')

        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

        // 引用
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

        // 列表项
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')

        // 换行
        .replace(/\n/g, '<br>');

    // 包装列表项
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // 创建完整的 HTML 文档
    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Markdown 内容</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background: #fff; 
                    color: #333; 
                }
                h1, h2, h3 { color: #2c3e50; margin-top: 30px; }
                h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
                code { 
                    background: #f8f9fa; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    font-family: 'Monaco', 'Consolas', monospace; 
                }
                pre { 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 5px; 
                    overflow-x: auto; 
                    border-left: 4px solid #3498db; 
                }
                pre code { background: none; padding: 0; }
                blockquote { 
                    border-left: 4px solid #3498db; 
                    margin: 0; 
                    padding-left: 20px; 
                    color: #7f8c8d; 
                    font-style: italic; 
                }
                ul { padding-left: 20px; }
                li { margin: 5px 0; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;

    return fullHtml;
}

// 获取输入类型信息字符串
function getInputTypeInfo(inputType, args) {
    switch (args.type) {
        case 'html':
            return '\n📝 内容来源: HTML 字符串';
        case 'url':
            if (inputType.includes('network')) {
                return '\n🌐 内容来源: 网络 URL (直接加载)';
            } else if (inputType.includes('html-file')) {
                return '\n📁 内容来源: HTML 文件';
            } else if (inputType.includes('markdown-file')) {
                return '\n📄 内容来源: Markdown 文件';
            } else {
                return '\n📁 内容来源: 本地文件';
            }
        case 'markdown':
            return '\n📄 内容来源: Markdown 字符串';
        case 'image':
            if (inputType.includes('base64')) {
                return '\n🖼️ 内容来源: Base64 图片';
            } else {
                return '\n🖼️ 内容来源: 图片文件';
            }
        default:
            return `\n📋 内容来源: ${args.type}`;
    }
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
                    type: {
                        type: 'string',
                        description: '内容类型标识',
                        enum: ['html', 'url', 'markdown', 'image'],
                        examples: {
                            'html': 'HTML 字符串内容',
                            'url': '本地文件路径或网络 URL',
                            'markdown': 'Markdown 字符串内容',
                            'image': '图片路径或 base64 数据'
                        }
                    },
                    content: {
                        type: 'string',
                        description: '根据 type 字段确定的内容。当 type=html 时为 HTML 字符串；当 type=url 时为文件路径或网络 URL；当 type=markdown 时为 Markdown 字符串；当 type=image 时为图片路径或 base64',
                        examples: {
                            'HTML 字符串 (type=html)': '<h1>Hello World</h1><p>这是一个简单的 HTML 界面</p>',
                            '文件路径 (type=url)': './templates/form.html',
                            '网络 URL (type=url)': 'https://example.com/page.html',
                            'Markdown 内容 (type=markdown)': '# 标题\n\n这是一个 **Markdown** 文档。\n\n- 列表项 1\n- 列表项 2',
                            '图片路径 (type=image)': './assets/image.png',
                            '图片 base64 (type=image)': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
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
                required: ['type', 'content']
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
        type,
        content,
        data = {},
        callbacks = {}
    } = args;

    console.log(`🎨 渲染动态 GUI: ${title}`);

    // 处理内容输入
    let processedHtml;
    let inputType;

    let htmlResult;
    try {
        htmlResult = processContentInput(type, content);
        processedHtml = htmlResult.content;
        inputType = `${htmlResult.type}${htmlResult.subType ? `(${htmlResult.subType})` : ''}`;
        console.log(`📋 处理内容: type=${type}, inputType=${inputType}`);
    } catch (error) {
        throw new Error(`内容输入处理失败: ${error.message}`);
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

            const windowConfig = {
                type: 'dynamic',
                title,
                width,
                height,
                data,
                callbacks
            };

            // 根据处理结果决定使用 HTML 还是 URL
            if (htmlResult.directUrl) {
                // 对于网络 URL，直接使用 URL 加载，避免 CSP 错误
                windowConfig.url = htmlResult.url;
                console.log(`🌐 使用直接 URL 模式加载网络内容: ${htmlResult.url}`);
            } else {
                // 对于其他类型（本地文件、HTML 字符串等），使用 HTML 内容
                windowConfig.html = processedHtml;
            }

            await global.createWindow(windowConfig);

            console.log('✅ MCP 窗口创建成功');

            const inputInfo = getInputTypeInfo(inputType, args);

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