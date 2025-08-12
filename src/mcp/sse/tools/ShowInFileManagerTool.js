const BaseToolHandler = require('./BaseToolHandler');
const showInFileManagerSchema = require('../schemas/showInFileManagerSchema');

/**
 * 在文件管理器中显示文件工具
 * 用于在文件管理器中显示指定的文件
 */
class ShowInFileManagerTool extends BaseToolHandler {
    constructor() {
        super(
            'show-in-file-manager',
            [
                '在文件管理器中显示指定的文件。',
                '支持显示任何类型的文件，包括 Markdown 文件。',
                '在 macOS 上会使用 Finder，在 Windows 上会使用资源管理器，在 Linux 上会使用默认的文件管理器。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return showInFileManagerSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证文件路径
        if (!args.filePath) {
            throw new Error('缺少 filePath 参数，请提供要显示的文件路径');
        }

        return true;
    }

    /**
     * 执行在文件管理器中显示文件
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 验证参数
            this.validate(args);

            this.log('info', `在文件管理器中显示文件: ${args.filePath}`);

            // 检查主进程支持
            if (!global.showItemInFolder) {
                throw new Error('当前环境不支持在文件管理器中显示文件，请在 Electron 主进程中运行。');
            }

            // 调用主进程功能在文件管理器中显示文件
            const result = await global.showItemInFolder(args.filePath);

            if (result.success) {
                return {
                    content: [{
                        type: 'text',
                        text: `✅ 已在文件管理器中显示文件:\n📁 ${args.filePath}`
                    }]
                };
            } else {
                throw new Error(result.error || '在文件管理器中显示文件失败');
            }
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
        this.log('info', '初始化在文件管理器中显示文件工具');
        
        // 检查主进程支持
        if (!global.showItemInFolder) {
            this.log('warn', '主进程中未找到 showItemInFolder 函数，在文件管理器中显示文件功能可能不可用');
        }

        this.log('info', '在文件管理器中显示文件工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理在文件管理器中显示文件工具');
    }
}

// 在全局作用域中创建辅助函数
global.showItemInFolder = async (filePath) => {
    try {
        // 检查 electron 是否可用
        const { ipcRenderer } = require('electron');
        if (!ipcRenderer) {
            throw new Error('Electron IPC 渲染器不可用');
        }
        
        // 调用主进程功能
        const result = await ipcRenderer.invoke('show-item-in-folder', filePath);
        return result;
    } catch (error) {
        console.error('调用主进程功能失败:', error);
        return { success: false, error: error.message };
    }
};

module.exports = ShowInFileManagerTool;