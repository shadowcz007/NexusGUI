/**
 * 通知工具的Schema定义
 */
const notificationSchema = {
    type: 'object',
    properties: {
        interval: {
            type: 'number',
            description: '通知间隔（毫秒）',
            minimum: 100,
            maximum: 60000,
            default: 1000
        },
        count: {
            type: 'number',
            description: '通知数量',
            minimum: 1,
            maximum: 100,
            default: 10
        },
        message: {
            type: 'string',
            description: '自定义通知消息模板。可以使用 {counter} 和 {timestamp} 占位符',
            default: '通知 #{counter} - {timestamp}'
        },
        level: {
            type: 'string',
            description: '通知级别',
            enum: ['info', 'warn', 'error', 'success'],
            default: 'info'
        }
    },
    examples: [
        {
            title: '基本通知流',
            description: '发送10条基本通知，间隔1秒',
            value: {
                interval: 1000,
                count: 10
            }
        },
        {
            title: '自定义通知',
            description: '发送自定义消息的通知',
            value: {
                interval: 2000,
                count: 5,
                message: '系统状态检查 #{counter} - {timestamp}',
                level: 'info'
            }
        }
    ]
};

module.exports = notificationSchema;