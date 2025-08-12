module.exports = {
    type: 'object',
    properties: {
        lines: {
            type: 'number',
            description: '要获取的日志行数',
            minimum: 1,
            maximum: 1000,
            default: 100
        },
        level: {
            type: 'string',
            description: '日志级别过滤器',
            enum: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'ALL'],
            default: 'ALL'
        }
    },
    required: [],
    examples: [
        {
            title: '获取最近100行日志',
            description: '获取最近100行所有级别的日志',
            value: {}
        },
        {
            title: '获取最近50行错误日志',
            description: '获取最近50行错误级别的日志',
            value: {
                lines: 50,
                level: 'ERROR'
            }
        },
        {
            title: '获取最近200行信息日志',
            description: '获取最近200行信息级别的日志',
            value: {
                lines: 200,
                level: 'INFO'
            }
        }
    ]
};