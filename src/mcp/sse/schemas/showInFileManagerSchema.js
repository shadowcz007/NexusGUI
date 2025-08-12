module.exports = {
    type: 'object',
    properties: {
        filePath: {
            type: 'string',
            description: '要显示的文件路径'
        }
    },
    required: ['filePath'],
    examples: [
        {
            title: '在文件管理器中显示文件',
            description: '在文件管理器中显示指定的文件',
            value: {
                filePath: '/path/to/your/file.md'
            }
        }
    ]
};