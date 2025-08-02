const BaseToolHandler = require('./BaseToolHandler');
const injectJSSchema = require('../schemas/injectJSSchema');

/**
 * JavaScript注入工具
 * 负责向当前活动窗口注入JavaScript代码
 */
class InjectJSTool extends BaseToolHandler {
    constructor() {
        super(
            'inject-js',
            [
                '向当前活动窗口注入 JavaScript 代码。',
                '可用于动态更新窗口内容、修改样式、添加事件监听器等。',
                '支持同步或异步执行代码，并可返回执行结果。',
                '可以传递参数给注入的代码，以实现更灵活的操作。',
                '注入的代码在窗口的上下文中执行，可以访问窗口的所有 DOM 元素和 JavaScript API。',
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
        return injectJSSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证代码参数
        if (!args.code || typeof args.code !== 'string') {
            throw new Error('代码不能为空且必须是字符串');
        }

        // 验证代码长度
        if (args.code.length > 1000000) {
            throw new Error(`代码长度超出限制 (${args.code.length} > 1000000)`);
        }

        // 验证参数对象
        if (args.params && typeof args.params !== 'object') {
            throw new Error('params 参数必须是对象类型');
        }

        return true;
    }

    /**
     * 执行JavaScript注入
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        const {
            code = '',
            waitForResult = false,
            params = {}
        } = args;

        try {
            this.log('info', `注入 JavaScript 代码到当前窗口${waitForResult ? ' (同步等待结果)' : ''}`, {
                codeLength: code.length,
                waitForResult,
                paramsCount: Object.keys(params).length
            });

            // 检查主进程支持
            if (!global.injectJsToWindow) {
                return this.handleMissingMainProcessSupport(code);
            }

            // 创建注入配置
            const injectConfig = {
                code,
                waitForResult,
                params
            };

            this.log('info', 'MCP 调用代码注入', { 
                codeLength: code.length, 
                waitForResult 
            });

            // 根据 waitForResult 参数决定是否等待结果
            if (waitForResult) {
                // 同步等待执行结果
                const result = await global.injectJsToWindow(injectConfig);
                
                this.log('info', 'MCP 代码注入完成', { result });

                return {
                    content: [{
                        type: 'text',
                        text: `✅ JavaScript 代码已成功注入到当前窗口\n📊 执行结果: ${JSON.stringify(result)}`
                    }],
                    result: result
                };
            } else {
                // 异步注入代码（不等待结果）
                await global.injectJsToWindow(injectConfig);
                
                this.log('info', 'MCP 代码注入成功');

                return {
                    content: [{
                        type: 'text',
                        text: `✅ JavaScript 代码已成功注入到当前窗口\n📝 代码长度: ${code.length} 字符\n⏱️ 异步执行中，未等待结果`
                    }]
                };
            }
        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 处理主进程支持缺失的情况
     * @param {string} code - 要注入的代码
     * @returns {Object} 错误提示结果
     */
    handleMissingMainProcessSupport(code) {
        this.log('warn', '主进程中未找到 injectJsToWindow 函数');
        
        const setupInstructions = this.generateSetupInstructions();
        const codePreview = code.substring(0, 200) + (code.length > 200 ? '...' : '');

        return {
            content: [{
                type: 'text',
                text: `❌ 代码注入功能未启用\n\n📋 需要在 Electron 主进程中添加以下代码：\n\n\`\`\`javascript\n${setupInstructions}\n\`\`\`\n\n📝 代码预览：\n${codePreview}\n\n🔧 请将上述代码添加到你的 Electron 主进程文件中，然后重新启动应用。`
            }]
        };
    }

    /**
     * 生成主进程设置指导代码
     * @returns {string} 设置指导代码
     */
    generateSetupInstructions() {
        return `const { BrowserWindow } = require('electron');

// 全局函数：向当前活动窗口注入 JavaScript 代码
global.injectJsToWindow = async (config) => {
    const { code, waitForResult, params } = config;
    
    // 获取当前焦点窗口
    let targetWindow = BrowserWindow.getFocusedWindow();
    
    // 如果没有焦点窗口，尝试获取所有窗口中的第一个
    if (!targetWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
            targetWindow = allWindows[0];
        }
    }
    
    if (!targetWindow) {
        throw new Error('找不到可用的窗口');
    }
    
    // 准备要执行的代码
    const wrappedCode = \`
        (function() {
            try {
                const injectedParams = \${JSON.stringify(params)};
                const result = (function() {
                    \${code}
                })();
                return result;
            } catch (error) {
                return { error: error.message };
            }
        })();
    \`;
    
    // 执行代码
    if (waitForResult) {
        const result = await targetWindow.webContents.executeJavaScript(wrappedCode);
        return result;
    } else {
        targetWindow.webContents.executeJavaScript(wrappedCode)
            .catch(error => console.error('异步代码执行错误:', error));
        return { status: 'executing' };
    }
};`;
    }

    /**
     * 验证JavaScript代码安全性（基础检查）
     * @param {string} code - JavaScript代码
     * @returns {boolean} 是否安全
     */
    validateCodeSafety(code) {
        // 基础的安全检查，可以根据需要扩展
        const dangerousPatterns = [
            /require\s*\(/,  // Node.js require
            /process\./,     // Node.js process
            /fs\./,          // 文件系统
            /child_process/, // 子进程
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                this.log('warn', '检测到潜在危险的代码模式', { pattern: pattern.toString() });
                return false;
            }
        }

        return true;
    }

    /**
     * 包装JavaScript代码
     * @param {string} code - 原始代码
     * @param {Object} params - 参数对象
     * @returns {string} 包装后的代码
     */
    wrapCode(code, params = {}) {
        return `
        (function() {
            try {
                const injectedParams = ${JSON.stringify(params)};
                const result = (function() {
                    ${code}
                })();
                return result;
            } catch (error) {
                return { error: error.message, stack: error.stack };
            }
        })();
        `;
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化JavaScript注入工具');
        
        // 检查主进程支持
        if (!global.injectJsToWindow) {
            this.log('warn', '主进程中未找到 injectJsToWindow 函数，JavaScript注入功能可能不可用');
        }
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理JavaScript注入工具');
        // 这里可以添加清理逻辑
    }
}

module.exports = InjectJSTool;