const BaseToolHandler = require('./BaseToolHandler');
const quickTestSchema = require('../schemas/quickTestSchema');
const { generateTestInterfaceHTML } = require('../../../main/html');

/**
 * 快速测试工具
 * 用于渲染预定义的测试界面
 */
class QuickTestTool extends BaseToolHandler {
    constructor() {
        super(
            'quick-test',
            [
                '渲染预定义的测试界面。',
                '支持三种测试界面类型：基础测试、表单测试、仪表板测试。',
                '用于快速验证 NexusGUI 的功能和性能。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return quickTestSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证testType参数
        const validTestTypes = ['basic', 'form', 'dashboard'];
        if (args.testType && !validTestTypes.includes(args.testType)) {
            throw new Error(`testType 参数必须是 "${validTestTypes.join('", "')}" 中的一个`);
        }

        return true;
    }

    /**
     * 执行快速测试
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 验证参数
            this.validate(args);

            this.log('info', `执行快速测试: ${args.testType}`);

            // 检查主进程支持
            if (!global.createWindow) {
                throw new Error('当前环境不支持窗口创建，请在 Electron 主进程中运行。');
            }

            // 生成测试界面HTML
            const testHtml = generateTestInterfaceHTML(args.testType);

            // 定义测试界面配置
            const testConfigs = {
                'basic': {
                    title: '基础测试界面',
                    width: 800,
                    height: 600
                },
                'form': {
                    title: '表单测试界面',
                    width: 600,
                    height: 700
                },
                'dashboard': {
                    title: '仪表板测试界面',
                    width: 1000,
                    height: 800
                }
            };

            const config = testConfigs[args.testType] || testConfigs['basic'];

            // 创建窗口配置
            const windowConfig = {
                type: 'dynamic',
                title: config.title,
                width: config.width,
                height: config.height,
                html: testHtml,
                data: {},
                callbacks: {},
                reuseWindow: false,
                waitForResult: false
            };

            // 创建窗口
            await global.createWindow(windowConfig);

            // 返回成功消息
            return {
                content: [{
                    type: 'text',
                    text: `✅ 快速测试界面已渲染\n📋 类型: ${args.testType}\n📱 标题: ${config.title}\n📐 尺寸: ${config.width}x${config.height}\n🆕 已创建新窗口`
                }]
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
        this.log('info', '初始化快速测试工具');

        // 检查主进程支持
        if (!global.createWindow) {
            this.log('warn', '主进程中未找到 createWindow 函数，快速测试功能可能不可用');
        }

        this.log('info', '快速测试工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理快速测试工具');
    }
}

module.exports = QuickTestTool;