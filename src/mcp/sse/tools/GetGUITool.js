const BaseToolHandler = require('./BaseToolHandler');

/**
 * 获取GUI缓存工具
 * 用于获取保存的最新传入的HTML内容
 */
class GetGUITool extends BaseToolHandler {
    constructor() {
        super(
            'get-gui',
            [
                '获取保存的最新传入的HTML内容。',
                '返回render-gui工具缓存的HTML内容和相关配置信息。',
                '包含HTML内容、窗口配置、缓存时间等信息。',
                '如果没有缓存内容，将返回相应提示。',
                '从全局缓存中获取数据，不依赖特定实例。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return {
            type: 'object',
            properties: {
                format: {
                    type: 'string',
                    description: '返回格式：summary(摘要信息) 或 full(完整内容)',
                    enum: ['summary', 'full'],
                    default: 'summary'
                },
                showHtml: {
                    type: 'boolean',
                    description: '是否在返回结果中包含完整的HTML内容',
                    default: false
                }
            },
            required: [],
            examples: [
                {
                    title: '获取缓存摘要',
                    description: '获取缓存的HTML基本信息',
                    value: {
                        format: 'summary'
                    }
                },
                {
                    title: '获取完整缓存内容',
                    description: '获取包含HTML内容的完整缓存信息',
                    value: {
                        format: 'full',
                        showHtml: true
                    }
                }
            ]
        };
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证format参数
        if (args.format && !['summary', 'full'].includes(args.format)) {
            throw new Error('format 参数必须是 "summary" 或 "full"');
        }

        return true;
    }

    /**
     * 执行获取GUI缓存
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            const format = args.format || 'summary';
            const showHtml = args.showHtml || false;

            this.log('info', `获取GUI缓存内容，格式: ${format}`);

            // 直接从全局获取缓存内容
            const cachedData = global.renderGuiCache;

            if (!cachedData) {
                return {
                    content: [{
                        type: 'text',
                        text: '❌ 没有找到缓存的HTML内容\n💡 请先使用 render-gui 工具渲染界面以创建缓存'
                    }]
                };
            }

            // 构建返回信息
            let responseText = '';
            let resultData = {};

            if (format === 'summary') {
                // 摘要格式
                const htmlPreview = cachedData.html.length > 100 
                    ? cachedData.html.substring(0, 100) + '...'
                    : cachedData.html;

                responseText = [
                    '✅ 找到缓存的HTML内容',
                    `📋 标题: ${cachedData.config.title}`,
                    `📱 窗口尺寸: ${cachedData.config.width}x${cachedData.config.height}`,
                    `📄 HTML长度: ${cachedData.html.length} 字符`,
                    `⏰ 缓存时间: ${new Date(cachedData.timestamp).toLocaleString('zh-CN')}`,
                    showHtml ? `\n📝 HTML预览:\n${htmlPreview}` : ''
                ].filter(Boolean).join('\n');

                resultData = {
                    hasCache: true,
                    title: cachedData.config.title,
                    windowSize: {
                        width: cachedData.config.width,
                        height: cachedData.config.height
                    },
                    htmlLength: cachedData.html.length,
                    cacheTime: cachedData.timestamp,
                    htmlPreview: showHtml ? htmlPreview : undefined
                };
            } else {
                // 完整格式
                responseText = [
                    '✅ 缓存的HTML完整内容',
                    `📋 标题: ${cachedData.config.title}`,
                    `📱 窗口尺寸: ${cachedData.config.width}x${cachedData.config.height}`,
                    `⏰ 缓存时间: ${new Date(cachedData.timestamp).toLocaleString('zh-CN')}`,
                    `📊 数据对象: ${JSON.stringify(cachedData.config.data)}`,
                    `🔧 回调函数: ${Object.keys(cachedData.config.callbacks || {}).join(', ') || '无'}`,
                    showHtml ? `\n📝 完整HTML内容:\n${cachedData.html}` : '\n💡 使用 showHtml: true 参数查看完整HTML内容'
                ].join('\n');

                resultData = {
                    hasCache: true,
                    title: cachedData.config.title,
                    windowSize: {
                        width: cachedData.config.width,
                        height: cachedData.config.height
                    },
                    htmlLength: cachedData.html.length,
                    cacheTime: cachedData.timestamp,
                    data: cachedData.config.data,
                    callbacks: Object.keys(cachedData.config.callbacks || {}),
                    html: showHtml ? cachedData.html : undefined
                };
            }

            this.log('info', 'GUI缓存获取完成', { 
                format,
                showHtml,
                htmlLength: cachedData.html.length,
                title: cachedData.config.title
            });

            return {
                content: [{
                    type: 'text',
                    text: responseText
                }],
                cache: resultData
            };

        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化获取GUI缓存工具');
        this.log('info', '获取GUI缓存工具初始化完成，支持从全局缓存获取数据');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理获取GUI缓存工具');
    }
}

module.exports = GetGUITool;