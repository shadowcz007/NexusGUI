/**
 * GUI渲染工具的Schema定义
 */
const renderGUISchema = {
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
            minimum: 0,
            maximum: 1
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
            maximum: 5,
            default: 1
        },
        type: {
            type: 'string',
            description: '内容类型标识',
            enum: ['html', 'url', 'markdown', 'image', 'auto'],
            examples: {
                'html': 'HTML 字符串内容',
                'url': '本地文件路径或网络 URL',
                'markdown': 'Markdown 字符串内容',
                'image': '图片路径或 base64 数据',
                'auto': '自动检测内容类型（需要配置LLM）'
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

        callbacks: {
            type: 'object',
            description: '事件回调函数映射，键为回调函数名称，值为 JavaScript 代码字符串。回调函数接收参数：data(全局数据)、sendResult(发送结果函数)、getFormData(获取表单数据函数)',
            additionalProperties: {
                type: 'string',
                description: 'JavaScript 代码字符串，可以访问 sendResult 参数'
            },
            examples: {
                'handleSubmit': 'sendResult({ action: "submit"  });',
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
    required: ['type', 'content'],
    examples: [
        {
            title: 'HTML 字符串渲染',
            description: '使用 type 和 content 字段渲染 HTML 字符串',
            value: {
                title: 'HTML 字符串界面',
                width: 600,
                height: 400,
                type: 'html',
                content: '<div style="padding: 20px; font-family: Arial, sans-serif;"><h1 style="color: #333; text-align: center;">HTML 字符串渲染</h1><div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><h2>功能特点</h2><ul><li>支持完整的 HTML 语法</li><li>可以使用内联样式</li><li>支持 JavaScript 事件</li><li>完全自定义的界面布局</li></ul></div><button onclick="alert(\'HTML 按钮被点击了！\')" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">点击我</button></div>'
            }
        },
        {
            title: 'HTML 文件路径渲染',
            description: '使用 type 和 content 字段渲染 HTML 文件',
            value: {
                title: 'HTML 文件界面',
                width: 800,
                height: 600,
                type: 'url',
                content: './templates/dashboard.html'
            }
        },
        {
            title: 'Markdown 内容渲染',
            description: '使用 Markdown 字符串渲染界面',
            value: {
                title: 'Markdown 界面',
                width: 700,
                height: 500,
                type: 'markdown',
                content: '# 欢迎使用 Markdown 渲染\n\n这是一个使用 **Markdown** 语法的界面示例。\n\n## 功能特点\n\n- 支持标准 Markdown 语法\n- 自动转换为 HTML\n- 支持代码块、表格、链接等\n\n\`\`\`javascript\nconsole.log("Hello, Markdown!");\n\`\`\`\n\n> 这是一个引用块示例'
            }
        },
        {
            title: '图片显示',
            description: '显示图片内容',
            value: {
                title: '图片查看器',
                width: 600,
                height: 400,
                type: 'image',
                content: './assets/sample-image.png'
            }
        }
    ]
};

module.exports = renderGUISchema;