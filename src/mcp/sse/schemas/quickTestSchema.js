module.exports = {
    type: 'object',
    properties: {
        testType: {
            type: 'string',
            description: '测试界面类型：basic(基础测试)、form(表单测试)、dashboard(仪表板测试)',
            enum: ['basic', 'form', 'dashboard']
        }
    },
    required: ['testType'],
    examples: [
        {
            title: '运行基础测试',
            description: '渲染基础测试界面',
            value: {
                testType: 'basic'
            }
        },
        {
            title: '运行表单测试',
            description: '渲染表单测试界面',
            value: {
                testType: 'form'
            }
        },
        {
            title: '运行仪表板测试',
            description: '渲染仪表板测试界面',
            value: {
                testType: 'dashboard'
            }
        }
    ]
};