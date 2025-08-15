const BaseToolHandler = require('./BaseToolHandler');
const testToolSchema = require('../schemas/testToolSchema');

/**
 * 工具测试工具
 * 用于测试其他 MCP 工具的调用
 */
class TestTool extends BaseToolHandler {
    constructor() {
        super(
            'test-tool',
            [
                '用于测试其他 MCP 工具的调用。',
                '支持指定工具名称和参数来测试工具执行。',
                '返回工具执行的详细结果和性能信息。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return testToolSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证tool参数
        if (!args.tool) {
            throw new Error('缺少 tool 参数，请提供要测试的工具名称');
        }

        // 验证params参数（如果提供）
        if (args.params && typeof args.params !== 'object') {
            throw new Error('params 参数必须是对象类型');
        }

        return true;
    }

    /**
     * 执行工具测试
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 验证参数
            this.validate(args);

            this.log('info', `测试工具调用: ${args.tool}`, { args });

            // 检查主进程支持
            if (!global.serverService) {
                throw new Error('当前环境不支持工具测试，请在 Electron 主进程中运行。');
            }

            // 获取服务器服务
            const serverService = global.serverService;
            
            // 检查工具注册器是否存在
            if (!serverService.sseServerInstance || !serverService.sseServerInstance.toolRegistry) {
                throw new Error('工具注册器不可用');
            }

            const toolRegistry = serverService.sseServerInstance.toolRegistry;

            // 检查工具是否存在
            if (!toolRegistry.hasTool(args.tool)) {
                // 获取所有可用工具
                const availableTools = toolRegistry.getToolNames();
                throw new Error(`工具 "${args.tool}" 不存在。可用工具: ${availableTools.join(', ')}`);
            }

            // 获取工具
            const tool = toolRegistry.getTool(args.tool);
            
            // 记录测试开始
            tool.log('info', '开始工具测试', { testParams: args.params });

            // 执行工具
            const startTime = Date.now();
            const result = await tool.execute(args.params || {});
            const duration = Date.now() - startTime;

            // 构建返回信息
            const resultLines = [
                '✅ 工具测试成功',
                '',
                '🔧 测试信息:',
                `  工具名称: ${args.tool}`,
                `  执行时间: ${duration}ms`,
                '',
                '📥 测试参数:',
                `  ${JSON.stringify(args.params || {}, null, 2)}`,
                '',
                '📤 执行结果:',
                `  ${JSON.stringify(result, null, 2)}`
            ];

            return {
                content: [{
                    type: 'text',
                    text: resultLines.join('\n')
                }],
                tool: args.tool,
                params: args.params,
                result: result,
                duration: duration,
                success: true
            };
        } catch (error) {
            this.handleError(error, { args });
            
            // 构建错误返回信息
            const errorLines = [
                '❌ 工具测试失败',
                '',
                '🔧 测试信息:',
                `  工具名称: ${args.tool || '未指定'}`,
                '',
                '📥 测试参数:',
                `  ${JSON.stringify(args.params || {}, null, 2)}`,
                '',
                '💥 错误信息:',
                `  ${error.message}`
            ];

            return {
                content: [{
                    type: 'text',
                    text: errorLines.join('\n')
                }],
                tool: args.tool,
                params: args.params,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化工具测试工具');

        // 检查主进程支持
        if (!global.serverService) {
            this.log('warn', '主进程中未找到 serverService，工具测试功能可能不可用');
        }

        this.log('info', '工具测试工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理工具测试工具');
    }
}

module.exports = TestTool;