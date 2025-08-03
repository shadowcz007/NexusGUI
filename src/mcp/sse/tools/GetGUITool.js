const BaseToolHandler = require('./BaseToolHandler');
const MarkdownUtils = require('../utils/markdownUtils');

/**
 * 获取GUI缓存工具
 * 用于获取保存的最新传入的HTML内容
 */
class GetGUITool extends BaseToolHandler {
    constructor() {
        super(
            'get-gui',
            [
                '获取保存的最新传入的HTML内容和Markdown文档。',
                '返回render-gui工具缓存的HTML内容、Markdown文档和相关配置信息。',
                '支持多种获取方式：HTML内容、Markdown文件路径、Markdown内容或两者兼有。',
                '包含HTML内容、Markdown文档、窗口配置、缓存时间等信息。',
                '支持快速获取Markdown文件路径，实现文档缓存和读取功能。',
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
                },
                returnType: {
                    type: 'string',
                    description: '返回内容类型：html(仅HTML) 或 markdown(仅Markdown) 或 both(两者都返回)',
                    enum: ['html', 'markdown', 'both'],
                    default: 'html'
                },
                markdownOnly: {
                    type: 'boolean',
                    description: '是否只返回Markdown文件路径（快速获取路径）',
                    default: false
                },
                readMarkdown: {
                    type: 'boolean',
                    description: '是否读取并返回Markdown文件内容',
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
                },
                {
                    title: '只获取Markdown文件路径',
                    description: '快速获取Markdown文件路径，不读取内容',
                    value: {
                        markdownOnly: true
                    }
                },
                {
                    title: '获取Markdown内容',
                    description: '读取并返回Markdown文件内容',
                    value: {
                        returnType: 'markdown',
                        readMarkdown: true
                    }
                },
                {
                    title: '同时获取HTML和Markdown',
                    description: '同时返回HTML和Markdown内容',
                    value: {
                        returnType: 'both',
                        showHtml: true,
                        readMarkdown: true
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

        // 验证returnType参数
        if (args.returnType && !['html', 'markdown', 'both'].includes(args.returnType)) {
            throw new Error('returnType 参数必须是 "html"、"markdown" 或 "both"');
        }

        // 验证参数组合逻辑
        if (args.markdownOnly && args.returnType && args.returnType !== 'markdown') {
            throw new Error('markdownOnly 为 true 时，returnType 应该是 "markdown" 或不设置');
        }

        if (args.markdownOnly && args.showHtml) {
            throw new Error('markdownOnly 为 true 时，不能同时设置 showHtml 为 true');
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
            const returnType = args.returnType || 'html';
            const markdownOnly = args.markdownOnly || false;
            const readMarkdown = args.readMarkdown || false;

            this.log('info', `获取GUI缓存内容，格式: ${format}, 类型: ${returnType}, 仅Markdown: ${markdownOnly}`);

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

            // 如果只需要Markdown文件路径
            if (markdownOnly) {
                if (!cachedData.markdown) {
                    return {
                        content: [{
                            type: 'text',
                            text: '❌ 没有找到缓存的Markdown文件\n💡 Markdown转换可能失败，请检查HTML内容'
                        }]
                    };
                }

                return {
                    content: [{
                        type: 'text',
                        text: `✅ Markdown文件路径\n📁 文件路径: ${cachedData.markdown.filePath}\n📁 最新文件: ${cachedData.markdown.latestFilePath}\n📄 文件大小: ${cachedData.markdown.size} 字节\n⏰ 创建时间: ${new Date(cachedData.markdown.created).toLocaleString('zh-CN')}`
                    }],
                    markdownPath: cachedData.markdown.filePath,
                    latestMarkdownPath: cachedData.markdown.latestFilePath
                };
            }

            // 准备Markdown内容（如果需要）
            let markdownContent = null;
            let markdownFileInfo = null;

            if ((returnType === 'markdown' || returnType === 'both') && readMarkdown && cachedData.markdown) {
                try {
                    markdownFileInfo = MarkdownUtils.readMarkdownFile(cachedData.markdown.filePath);
                    markdownContent = markdownFileInfo.content;
                } catch (error) {
                    this.log('warn', 'Markdown文件读取失败', { error: error.message });
                }
            }

            // 构建返回信息
            let responseText = '';
            let resultData = {};

            if (format === 'summary') {
                // 摘要格式
                const htmlPreview = cachedData.html.length > 100 
                    ? cachedData.html.substring(0, 100) + '...'
                    : cachedData.html;

                const markdownPreview = markdownContent && markdownContent.length > 100
                    ? markdownContent.substring(0, 100) + '...'
                    : markdownContent;

                const summaryLines = [
                    '✅ 找到缓存的内容',
                    `📋 标题: ${cachedData.config.title}`,
                    `📱 窗口尺寸: ${cachedData.config.width}x${cachedData.config.height}`,
                    `⏰ 缓存时间: ${new Date(cachedData.timestamp).toLocaleString('zh-CN')}`
                ];

                // 根据returnType添加相应信息
                if (returnType === 'html' || returnType === 'both') {
                    summaryLines.push(`📄 HTML长度: ${cachedData.html.length} 字符`);
                    if (showHtml) {
                        summaryLines.push(`\n📝 HTML预览:\n${htmlPreview}`);
                    }
                }

                if (returnType === 'markdown' || returnType === 'both') {
                    if (cachedData.markdown) {
                        summaryLines.push(`📝 Markdown长度: ${cachedData.markdown.content.length} 字符`);
                        summaryLines.push(`📁 Markdown文件: ${cachedData.markdown.filename}`);
                        if (readMarkdown && markdownContent) {
                            summaryLines.push(`\n📖 Markdown预览:\n${markdownPreview}`);
                        }
                    } else {
                        summaryLines.push('❌ Markdown转换失败');
                    }
                }

                responseText = summaryLines.filter(Boolean).join('\n');

                resultData = {
                    hasCache: true,
                    title: cachedData.config.title,
                    windowSize: {
                        width: cachedData.config.width,
                        height: cachedData.config.height
                    },
                    cacheTime: cachedData.timestamp,
                    htmlLength: cachedData.html.length,
                    htmlPreview: showHtml ? htmlPreview : undefined,
                    markdownInfo: cachedData.markdown ? {
                        length: cachedData.markdown.content.length,
                        filePath: cachedData.markdown.filePath,
                        filename: cachedData.markdown.filename,
                        preview: readMarkdown ? markdownPreview : undefined
                    } : null
                };
            } else {
                // 完整格式
                const fullLines = [
                    '✅ 缓存的完整内容',
                    `📋 标题: ${cachedData.config.title}`,
                    `📱 窗口尺寸: ${cachedData.config.width}x${cachedData.config.height}`,
                    `⏰ 缓存时间: ${new Date(cachedData.timestamp).toLocaleString('zh-CN')}`,
                    `📊 数据对象: ${JSON.stringify(cachedData.config.data)}`,
                    `🔧 回调函数: ${Object.keys(cachedData.config.callbacks || {}).join(', ') || '无'}`
                ];

                // 根据returnType添加相应内容
                if (returnType === 'html' || returnType === 'both') {
                    fullLines.push(showHtml ? `\n📝 完整HTML内容:\n${cachedData.html}` : '\n💡 使用 showHtml: true 参数查看完整HTML内容');
                }

                if (returnType === 'markdown' || returnType === 'both') {
                    if (cachedData.markdown) {
                        fullLines.push(`\n📁 Markdown文件信息:`);
                        fullLines.push(`  - 文件路径: ${cachedData.markdown.filePath}`);
                        fullLines.push(`  - 文件名: ${cachedData.markdown.filename}`);
                        fullLines.push(`  - 文件大小: ${cachedData.markdown.size} 字节`);
                        fullLines.push(`  - 创建时间: ${new Date(cachedData.markdown.created).toLocaleString('zh-CN')}`);
                        
                        if (readMarkdown && markdownContent) {
                            fullLines.push(`\n📖 完整Markdown内容:\n${markdownContent}`);
                        } else {
                            fullLines.push('\n💡 使用 readMarkdown: true 参数查看完整Markdown内容');
                        }
                    } else {
                        fullLines.push('\n❌ Markdown转换失败，无法提供Markdown内容');
                    }
                }

                responseText = fullLines.join('\n');

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
                    html: showHtml ? cachedData.html : undefined,
                    markdown: readMarkdown && markdownContent ? {
                        content: markdownContent,
                        filePath: cachedData.markdown?.filePath,
                        fileInfo: markdownFileInfo
                    } : undefined,
                    markdownInfo: cachedData.markdown || null
                };
            }

            this.log('info', 'GUI缓存获取完成', { 
                format,
                returnType,
                showHtml,
                readMarkdown,
                markdownOnly,
                htmlLength: cachedData.html.length,
                markdownLength: cachedData.markdown?.content.length || 0,
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