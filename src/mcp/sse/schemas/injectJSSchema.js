/**
 * JavaScript注入工具的Schema定义
 */
const injectJSSchema = {
    type: 'object',
    properties: {
        code: {
            type: 'string',
            description: '要注入的 JavaScript 代码。可以是函数定义、表达式或语句。'
        },
        waitForResult: {
            type: 'boolean',
            description: '是否等待代码执行结果。如果为 true，将阻塞直到代码执行完成并返回结果。',
            default: false
        },
        params: {
            type: 'object',
            description: '传递给注入代码的参数对象。可在注入代码中通过 injectedParams 变量访问。',
            additionalProperties: true,
            default: {}
        }
    },
    required: ['code'],
    examples: [
        {
            title: '更新页面标题',
            description: '修改当前窗口的页面标题',
            value: {
                code: 'document.title = "新标题"; return "标题已更新";',
                waitForResult: true
            }
        },
        {
            title: '获取表单数据',
            description: '获取页面中表单的所有字段值',
            value: {
                code: 'return Array.from(document.querySelectorAll("form input, form select, form textarea")).reduce((data, input) => { data[input.name] = input.value; return data; }, {});',
                waitForResult: true
            }
        },
        {
            title: '使用参数更新内容',
            description: '使用传入的参数更新页面内容',
            value: {
                code: 'const el = document.getElementById(injectedParams.elementId); if(el) { el.innerHTML = injectedParams.content; return true; } return false;',
                waitForResult: true,
                params: {
                    elementId: "status",
                    content: "<strong>更新成功!</strong>"
                }
            }
        }
    ]
};

module.exports = injectJSSchema;