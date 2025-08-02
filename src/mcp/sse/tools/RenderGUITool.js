const BaseToolHandler = require('./BaseToolHandler');
const renderGUISchema = require('../schemas/renderGUISchema');
const { HtmlUtils, WindowConfigValidator } = require('../utils/htmlUtils');

/**
 * GUI渲染工具
 * 负责渲染HTML界面到桌面窗口
 */
class RenderGUITool extends BaseToolHandler {
    constructor() {
        super(
            'render-gui',
            [
                '渲染 HTML 界面到桌面窗口。',
                '支持完整的 HTML、CSS 和 JavaScript，可以创建任意复杂的用户界面。',
                '支持丰富的窗口属性设置：菜单栏显示、置顶、任务栏显示、边框、大小调整、透明度、全屏等。',
                '可根据需要控制否是同步等待窗口结果',
                'HTML 内容可以是文件路径或直接的 HTML 字符串，优先使用HTML字符串。',
                '可使用的electronAPI={',
                '"sendResult":function(result){}, //用于同步等待结果',
                '}'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return renderGUISchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证HTML输入
        if (!args.html) {
            throw new Error('缺少 html 参数，请提供 HTML 文件路径或 HTML 字符串');
        }

        // 验证窗口配置
        WindowConfigValidator.validateWindowConfig(args);

        return true;
    }

    /**
     * 执行GUI渲染
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 应用默认配置
            const config = WindowConfigValidator.applyDefaults(args);
            
            this.log('info', `渲染动态 GUI: ${config.title}${config.waitForResult ? ' (同步等待结果)' : ''}`);

            // 处理 HTML 输入
            const htmlResult = this.processHtmlInput(config.html);
            const processedHtml = htmlResult.content;
            const inputType = htmlResult.type;

            // 检查主进程支持
            if (!global.createWindow) {
                throw new Error('当前环境不支持窗口创建，请在 Electron 主进程中运行。');
            }

            // 创建窗口配置
            const windowConfig = {
                type: 'dynamic',
                title: config.title,
                width: config.width,
                height: config.height,
                showMenuBar: config.showMenuBar,
                alwaysOnTop: config.alwaysOnTop,
                skipTaskbar: config.skipTaskbar,
                showInTaskbar: config.showInTaskbar,
                frame: config.frame,
                resizable: config.resizable,
                movable: config.movable,
                minimizable: config.minimizable,
                maximizable: config.maximizable,
                closable: config.closable,
                minWidth: config.minWidth,
                minHeight: config.minHeight,
                maxWidth: config.maxWidth,
                maxHeight: config.maxHeight,
                opacity: config.opacity,
                fullscreen: config.fullscreen,
                zoomFactor: config.zoomFactor,
                html: processedHtml,
                data: config.data,
                callbacks: config.callbacks,
                reuseWindow: config.reuseWindow,
                waitForResult: config.waitForResult
            };

            this.log('info', 'MCP 调用窗口创建', { 
                title: config.title, 
                width: config.width, 
                height: config.height, 
                inputType, 
                waitForResult: config.waitForResult 
            });

            // 根据 waitForResult 参数决定是否等待结果
            if (config.waitForResult) {
                // 同步等待窗口结果
                const result = await global.createWindow(windowConfig);
                
                this.log('info', 'MCP 窗口操作完成', { result });

                return {
                    content: [{
                        type: 'text',
                        text: `✅ 动态界面 "${config.title}" 操作已完成\n📱 窗口尺寸: ${config.width}x${config.height}\n📍 操作结果: ${result.action || '关闭'}\n📄 返回数据: ${JSON.stringify(result.data || {})}`
                    }],
                    result: result
                };
            } else {
                // 异步创建窗口
                await global.createWindow(windowConfig);
                
                this.log('info', 'MCP 窗口创建成功');

                // 构建窗口属性信息
                const windowProps = this.buildWindowPropsInfo(config);
                const reuseInfo = config.reuseWindow ? '\n🔄 已复用现有窗口' : '\n🆕 已创建新窗口';
                const inputInfo = inputType === 'file' ? '\n📁 HTML 来源: 文件路径' : '\n📝 HTML 来源: 字符串';

                return {
                    content: [{
                        type: 'text',
                        text: `✅ 动态界面 "${config.title}" 已成功${config.reuseWindow ? '更新' : '创建并渲染'}\n📱 窗口尺寸: ${config.width}x${config.height}${inputInfo}\n📍 窗口已显示在屏幕中央${windowProps}${reuseInfo}`
                    }]
                };
            }
        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 处理HTML输入
     * @param {string} htmlInput - HTML输入
     * @returns {Object} 处理结果
     */
    processHtmlInput(htmlInput) {
        try {
            return HtmlUtils.processHtmlInput(htmlInput);
        } catch (error) {
            throw new Error(`HTML 输入处理失败: ${error.message}`);
        }
    }

    /**
     * 构建窗口属性信息字符串
     * @param {Object} config - 窗口配置
     * @returns {string} 属性信息字符串
     */
    buildWindowPropsInfo(config) {
        const windowProps = [];
        
        if (config.showMenuBar) windowProps.push('显示菜单栏');
        if (config.alwaysOnTop) windowProps.push('始终置顶');
        if (config.skipTaskbar) windowProps.push('隐藏任务栏');
        if (!config.frame) windowProps.push('无边框');
        if (!config.resizable) windowProps.push('固定大小');
        if (config.fullscreen) windowProps.push('全屏');
        if (config.opacity !== undefined) windowProps.push(`透明度: ${config.opacity}`);
        if (config.zoomFactor !== 1.0) windowProps.push(`缩放: ${config.zoomFactor}`);

        return windowProps.length > 0 ? `\n🔧 窗口属性: ${windowProps.join(', ')}` : '';
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化GUI渲染工具');
        
        // 检查主进程支持
        if (!global.createWindow) {
            this.log('warn', '主进程中未找到 createWindow 函数，GUI渲染功能可能不可用');
        }
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理GUI渲染工具');
        // 这里可以添加清理逻辑，比如关闭所有创建的窗口
    }
}

module.exports = RenderGUITool;