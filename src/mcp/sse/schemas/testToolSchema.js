module.exports = {
    type: 'object',
    properties: {
        tool: {
            type: 'string',
            description: '要测试的工具名称'
        },
        params: {
            type: 'object',
            description: '工具参数',
            additionalProperties: true
        }
    },
    required: ['tool'],
    examples: [
        {
            title: '测试 render-gui 工具',
            description: '测试 render-gui 工具的基本调用',
            value: {
                tool: 'render-gui',
                params: {
                    title: '测试界面',
                    width: 800,
                    height: 600,
                    html: '<div style="padding: 20px;"><h1>测试界面</h1><p>这是一个测试界面</p></div>'
                }
            }
        },
        {
            title: '测试 get-context 工具',
            description: '测试 get-context 工具的调用',
            value: {
                tool: 'get-context',
                params: {
                    format: 'summary',
                    returnType: 'both'
                }
            }
        },
        {
            title: '测试 network-status 工具',
            description: '测试 network-status 工具的调用',
            value: {
                tool: 'network-status',
                params: {}
            }
        }
    ]
};