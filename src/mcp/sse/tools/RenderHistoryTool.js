const BaseToolHandler = require('./BaseToolHandler');
const renderHistorySchema = require('../schemas/renderHistorySchema');

/**
 * 渲染历史记录工具
 * 用于查看和渲染最近渲染的界面历史记录
 */
class RenderHistoryTool extends BaseToolHandler {
    constructor() {
        super(
            'render-history',
            [
                '查看和渲染最近渲染的界面历史记录。',
                '支持列出历史记录和重新渲染历史界面。',
                '历史记录最多保存10个最近渲染的界面。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return renderHistorySchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证action参数
        if (args.action && !['list', 'render'].includes(args.action)) {
            throw new Error('action 参数必须是 "list" 或 "render"');
        }

        // 如果action是render，必须提供id
        if (args.action === 'render' && !args.id) {
            throw new Error('action 为 "render" 时，必须提供 id 参数');
        }

        return true;
    }

    /**
     * 执行渲染历史记录操作
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 验证参数
            this.validate(args);

            this.log('info', `执行渲染历史记录操作: ${args.action}`);

            // 检查主进程支持
            if (!global.appStateService || !global.createWindow) {
                throw new Error('当前环境不支持渲染历史记录功能，请在 Electron 主进程中运行。');
            }

            // 根据action执行不同操作
            if (args.action === 'list') {
                return await this.listHistory();
            } else if (args.action === 'render') {
                return await this.renderFromHistory(args.id);
            }
        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 列出历史记录
     * @returns {Promise<Object>} 执行结果
     */
    async listHistory() {
        try {
            const history = global.appStateService.getRenderHistory();
            
            if (history.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: '❌ 暂无渲染历史记录\n💡 使用 render-gui 工具渲染界面以创建历史记录'
                    }]
                };
            }

            const historyLines = [
                '✅ 最近渲染的界面历史记录',
                `📋 共 ${history.length} 个记录`,
                ''
            ];

            history.forEach((item, index) => {
                const timestamp = new Date(item.timestamp).toLocaleString('zh-CN');
                historyLines.push(`${index + 1}. ${item.title}`);
                historyLines.push(`   ⏰ 时间: ${timestamp}`);
                historyLines.push(`   📐 尺寸: ${item.config.width}x${item.config.height}`);
                historyLines.push(`   🆔 ID: ${item.id}`);
                historyLines.push('');
            });

            historyLines.push('💡 使用 { action: "render", id: "记录ID" } 参数重新渲染指定界面');

            return {
                content: [{
                    type: 'text',
                    text: historyLines.join('\n')
                }],
                history: history
            };
        } catch (error) {
            throw new Error(`获取历史记录失败: ${error.message}`);
        }
    }

    /**
     * 从历史记录渲染界面
     * @param {string} id - 历史记录ID
     * @returns {Promise<Object>} 执行结果
     */
    async renderFromHistory(id) {
        try {
            // 获取历史记录项
            const historyItem = global.appStateService.getRenderHistoryItem(id);
            if (!historyItem) {
                return {
                    content: [{
                        type: 'text',
                        text: `❌ 未找到历史记录项\n💡 请使用 "render-history" 工具并设置 action: "list" 参数查看可用的历史记录`
                    }]
                };
            }

            // 检查全局缓存中是否有完整的HTML内容
            // 如果全局缓存中的项匹配，则使用它
            if (global.renderGuiCache && 
                global.renderGuiCache.config.title === historyItem.config.title &&
                global.renderGuiCache.timestamp === historyItem.timestamp) {
                // 使用缓存的HTML内容
                const windowConfig = {
                    type: 'dynamic',
                    title: global.renderGuiCache.config.title,
                    width: global.renderGuiCache.config.width,
                    height: global.renderGuiCache.config.height,
                    html: global.renderGuiCache.html,
                    data: global.renderGuiCache.config.data,
                    callbacks: global.renderGuiCache.config.callbacks,
                    reuseWindow: true,
                    waitForResult: false
                };
                
                await global.createWindow(windowConfig);
                
                return {
                    content: [{
                        type: 'text',
                        text: `✅ 已重新渲染界面\n📋 标题: ${historyItem.config.title}\n📱 尺寸: ${historyItem.config.width}x${historyItem.config.height}\n🔄 已复用现有窗口`
                    }]
                };
            } else {
                // 没有缓存的HTML内容，提示用户
                return {
                    content: [{
                        type: 'text',
                        text: `❌ 无法重新渲染 "${historyItem.config.title}"\n💡 HTML内容已丢失，请重新使用 render-gui 工具渲染界面`
                    }]
                };
            }
        } catch (error) {
            throw new Error(`从历史记录渲染界面失败: ${error.message}`);
        }
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化渲染历史记录工具');
        
        // 检查主进程支持
        if (!global.appStateService) {
            this.log('warn', '主进程中未找到 appStateService，渲染历史记录功能可能不可用');
        }
        
        if (!global.createWindow) {
            this.log('warn', '主进程中未找到 createWindow 函数，渲染历史记录功能可能不可用');
        }

        this.log('info', '渲染历史记录工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理渲染历史记录工具');
    }
}

module.exports = RenderHistoryTool;