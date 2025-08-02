const fs = require('fs');
const path = require('path');

/**
 * HTML输入处理工具类
 * 提供HTML文件和字符串的处理功能
 */
class HtmlUtils {
    /**
     * 处理HTML输入
     * @param {string} htmlInput - HTML输入（文件路径或HTML字符串）
     * @returns {Object} 处理结果
     */
    static processHtmlInput(htmlInput) {
        if (!htmlInput || typeof htmlInput !== 'string') {
            throw new Error('HTML 输入不能为空且必须是字符串');
        }

        // 1. 优先判断是否是 HTML 文件地址
        if (this.isHtmlFilePath(htmlInput)) {
            console.log(`📁 检测到 HTML 文件路径: ${htmlInput}`);
            try {
                const resolvedPath = path.resolve(htmlInput);
                const htmlContent = fs.readFileSync(resolvedPath, 'utf8');
                console.log(`✅ 成功读取 HTML 文件，内容长度: ${htmlContent.length}`);
                return {
                    type: 'file',
                    path: htmlInput,
                    content: htmlContent
                };
            } catch (error) {
                throw new Error(`读取 HTML 文件失败: ${error.message}`);
            }
        }
        
        // 2. 其次判断是否是 HTML 字符串
        if (this.isHtmlString(htmlInput)) {
            console.log(`📝 检测到 HTML 字符串，长度: ${htmlInput.length}`);
            return {
                type: 'string',
                content: htmlInput
            };
        }
        
        throw new Error('无效的 HTML 输入，必须是 HTML 文件路径或 HTML 字符串');
    }

    /**
     * 检查是否是HTML文件路径
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是文件路径
     */
    static isHtmlFilePath(input) {
        return typeof input === 'string' && 
               (input.endsWith('.html') || 
                input.endsWith('.htm') ||
                input.includes('/') || 
                input.includes('\\')) &&
               !input.includes('<') && 
               !input.includes('>');
    }

    /**
     * 检查是否是HTML字符串
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是HTML字符串
     */
    static isHtmlString(input) {
        return typeof input === 'string' && 
               input.includes('<') && 
               input.includes('>');
    }

    /**
     * 验证HTML内容
     * @param {string} htmlContent - HTML内容
     * @returns {boolean} 是否有效
     */
    static validateHtmlContent(htmlContent) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return false;
        }

        // 基本的HTML标签检查
        const hasOpenTag = htmlContent.includes('<');
        const hasCloseTag = htmlContent.includes('>');
        
        return hasOpenTag && hasCloseTag;
    }

    /**
     * 清理HTML内容
     * @param {string} htmlContent - HTML内容
     * @returns {string} 清理后的HTML内容
     */
    static sanitizeHtmlContent(htmlContent) {
        if (!htmlContent) {
            return '';
        }

        // 移除潜在的危险脚本（可选，根据需求调整）
        // 这里只做基本清理，实际项目中可能需要更严格的清理
        return htmlContent.trim();
    }

    /**
     * 获取HTML文件的元信息
     * @param {string} filePath - 文件路径
     * @returns {Object} 文件元信息
     */
    static getHtmlFileInfo(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            return {
                path: filePath,
                size: stats.size,
                modified: stats.mtime,
                contentLength: content.length,
                isValid: this.validateHtmlContent(content)
            };
        } catch (error) {
            throw new Error(`获取HTML文件信息失败: ${error.message}`);
        }
    }
}

/**
 * 窗口配置验证工具类
 */
class WindowConfigValidator {
    /**
     * 验证窗口配置
     * @param {Object} config - 窗口配置
     * @returns {boolean} 验证结果
     */
    static validateWindowConfig(config) {
        const errors = [];

        // 验证窗口尺寸
        if (config.width !== undefined) {
            if (typeof config.width !== 'number' || config.width < 200 || config.width > 2000) {
                errors.push(`窗口宽度 ${config.width} 超出有效范围 (200-2000)`);
            }
        }

        if (config.height !== undefined) {
            if (typeof config.height !== 'number' || config.height < 200 || config.height > 2000) {
                errors.push(`窗口高度 ${config.height} 超出有效范围 (200-2000)`);
            }
        }

        // 验证最小尺寸
        if (config.minWidth !== undefined) {
            if (typeof config.minWidth !== 'number' || config.minWidth < 200) {
                errors.push(`窗口最小宽度 ${config.minWidth} 不能小于 200`);
            }
        }

        if (config.minHeight !== undefined) {
            if (typeof config.minHeight !== 'number' || config.minHeight < 200) {
                errors.push(`窗口最小高度 ${config.minHeight} 不能小于 200`);
            }
        }

        // 验证透明度
        if (config.opacity !== undefined) {
            if (typeof config.opacity !== 'number' || config.opacity < 0 || config.opacity > 1) {
                errors.push(`窗口透明度 ${config.opacity} 超出有效范围 (0.0-1.0)`);
            }
        }

        // 验证缩放因子
        if (config.zoomFactor !== undefined) {
            if (typeof config.zoomFactor !== 'number' || config.zoomFactor < 0.25 || config.zoomFactor > 5) {
                errors.push(`窗口缩放因子 ${config.zoomFactor} 超出有效范围 (0.25-5.0)`);
            }
        }

        // 验证回调函数
        if (config.callbacks && typeof config.callbacks === 'object') {
            Object.entries(config.callbacks).forEach(([name, code]) => {
                if (typeof code !== 'string') {
                    errors.push(`回调函数 "${name}" 必须是字符串类型`);
                }
                if (code.trim().length === 0) {
                    errors.push(`回调函数 "${name}" 不能为空`);
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`窗口配置验证失败:\n${errors.join('\n')}`);
        }

        return true;
    }

    /**
     * 应用默认窗口配置
     * @param {Object} config - 用户配置
     * @returns {Object} 完整配置
     */
    static applyDefaults(config) {
        return {
            title: '动态界面',
            width: 800,
            height: 600,
            showMenuBar: false,
            alwaysOnTop: true,
            skipTaskbar: false,
            showInTaskbar: true,
            frame: true,
            resizable: true,
            movable: true,
            minimizable: true,
            maximizable: true,
            closable: true,
            minWidth: 400,
            minHeight: 300,
            fullscreen: false,
            zoomFactor: 1.0,
            data: {},
            callbacks: {},
            reuseWindow: false,
            waitForResult: false,
            ...config
        };
    }
}

module.exports = {
    HtmlUtils,
    WindowConfigValidator
};