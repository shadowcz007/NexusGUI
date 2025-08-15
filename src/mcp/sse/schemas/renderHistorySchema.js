module.exports = {
    type: 'object',
    properties: {
        action: {
            type: 'string',
            description: '操作类型：list(列出历史记录) 或 render(渲染历史界面)',
            enum: ['list', 'render']
        },
        id: {
            type: 'string',
            description: '历史记录项的ID（仅在action为render时需要）'
        }
    },
    required: ['action'],
    examples: [
        {
            title: '列出历史记录',
            description: '列出最近渲染的界面历史记录',
            value: {
                action: 'list'
            }
        },
        {
            title: '渲染历史界面',
            description: '渲染指定的历史界面',
            value: {
                action: 'render',
                id: '1234567890'
            }
        }
    ]
};