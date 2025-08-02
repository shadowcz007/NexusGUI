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
    examples: [
        {
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
};

module.exports = renderGUISchema;