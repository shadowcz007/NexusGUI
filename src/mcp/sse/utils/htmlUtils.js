const fs = require('fs');
const path = require('path');
const LLMTypeDetector = require('../tools/LLMTypeDetector');

/**
 * HTML输入处理工具类
 * 提供HTML文件和字符串的处理功能
 */
class HtmlUtils {
    /**
     * 处理内容输入（新版本，支持 type 字段）
     * @param {string} type - 内容类型 ('html', 'url', 'markdown', 'image', 'auto')
     * @param {string} content - 内容数据
     * @returns {Object} 处理结果
     */
    static processContentInput(type, content) {
        if (!type || !content) {
            throw new Error('type 和 content 参数都不能为空');
        }

        if (typeof type !== 'string' || typeof content !== 'string') {
            throw new Error('type 和 content 必须是字符串类型');
        }

        const validTypes = ['html', 'url', 'markdown', 'image', 'auto'];
        if (!validTypes.includes(type)) {
            throw new Error(`无效的 type 值: ${type}，必须是 ${validTypes.join(', ')} 之一`);
        }

        // 如果是auto类型，使用LLM自动检测
        if (type === 'auto') {
            // 同步版本返回默认处理结果（HTML）
            console.warn('警告: auto类型需要异步处理，这里返回原始内容作为html类型');
            return this.processHtmlContent(content);
        }

        switch (type) {
            case 'html':
                return this.processHtmlContent(content);

            case 'url':
                return this.processUrlContent(content);

            case 'markdown':
                return this.processMarkdownContent(content);

            case 'image':
                return this.processImageContent(content);

            default:
                throw new Error(`不支持的内容类型: ${type}`);
        }
    }

    /**
     * 异步处理内容输入（支持 auto 类型的LLM检测）
     * @param {string} type - 内容类型 ('html', 'url', 'markdown', 'image', 'auto')
     * @param {string} content - 内容数据
     * @returns {Promise<Object>} 处理结果
     */
    static async processContentInputAsync(type, content) {
        if (!type || !content) {
            throw new Error('type 和 content 参数都不能为空');
        }

        if (typeof type !== 'string' || typeof content !== 'string') {
            throw new Error('type 和 content 必须是字符串类型');
        }

        const validTypes = ['html', 'url', 'markdown', 'image', 'auto'];
        if (!validTypes.includes(type)) {
            throw new Error(`无效的 type 值: ${type}，必须是 ${validTypes.join(', ')} 之一`);
        }

        // 如果是auto类型，使用LLM自动检测
        if (type === 'auto') {
            try {
                console.log('🔍 使用LLM自动检测内容类型');
                const detectedType = await LLMTypeDetector.detectType(content);
                console.log(`🤖 LLM检测结果: ${detectedType}`);
                // 递归调用处理检测到的类型
                return await this.processContentInputAsync(detectedType, content);
            } catch (error) {
                console.warn(`⚠️ LLM类型检测失败: ${error.message}，使用默认HTML处理`);
                // 如果LLM检测失败，回退到HTML处理
                return this.processHtmlContent(content);
            }
        }

        switch (type) {
            case 'html':
                return this.processHtmlContent(content);

            case 'url':
                return this.processUrlContent(content);

            case 'markdown':
                return this.processMarkdownContent(content);

            case 'image':
                return this.processImageContent(content);

            default:
                throw new Error(`不支持的内容类型: ${type}`);
        }
    }

    /**
     * 处理 HTML 内容
     * @param {string} htmlContent - HTML 字符串
     * @returns {Object} 处理结果
     */
    static processHtmlContent(htmlContent) {
        if (!this.isHtmlString(htmlContent)) {
            throw new Error('提供的内容不是有效的 HTML 字符串');
        }

        console.log(`📝 处理 HTML 字符串，长度: ${htmlContent.length}`);
        return {
            type: 'html',
            originalType: 'html',
            content: htmlContent
        };
    }

    /**
     * 处理 URL 内容（文件路径或网络 URL）
     * @param {string} urlContent - 文件路径或网络 URL
     * @returns {Object} 处理结果
     */
    static processUrlContent(urlContent) {
        // 检查是否是网络 URL
        if (this.isNetworkUrl(urlContent)) {
            console.log(`🌐 检测到网络 URL: ${urlContent}`);
            // 对于网络 URL，直接返回 URL，让窗口直接加载，避免 iframe 和 CSP 错误
            // 这样可以让网站在 Electron 窗口中正常显示，而不是被 CSP 策略阻止
            return {
                type: 'url',
                originalType: 'url',
                subType: 'network',
                url: urlContent,
                content: urlContent, // 直接返回 URL 而不是包含 iframe 的 HTML
                directUrl: true // 标识这是一个需要直接加载的 URL
            };
        }

        // 检查是否是本地文件路径
        if (this.isLocalFilePath(urlContent)) {
            console.log(`📁 检测到本地文件路径: ${urlContent}`);
            try {
                const resolvedPath = path.resolve(urlContent);
                const fileContent = fs.readFileSync(resolvedPath, 'utf8');
                const fileExt = path.extname(urlContent).toLowerCase();

                // 根据文件扩展名处理不同类型的文件
                if (['.html', '.htm'].includes(fileExt)) {
                    console.log(`✅ 成功读取 HTML 文件，内容长度: ${fileContent.length}`);
                    return {
                        type: 'url',
                        originalType: 'url',
                        subType: 'html-file',
                        path: urlContent,
                        content: fileContent
                    };
                } else if (['.md', '.markdown'].includes(fileExt)) {
                    console.log(`✅ 成功读取 Markdown 文件，内容长度: ${fileContent.length}`);
                    // 将 Markdown 转换为 HTML
                    const htmlContent = this.convertMarkdownToHtml(fileContent);
                    return {
                        type: 'url',
                        originalType: 'url',
                        subType: 'markdown-file',
                        path: urlContent,
                        content: htmlContent
                    };
                } else {
                    // 对于其他文件类型，尝试作为文本显示
                    console.log(`✅ 成功读取文本文件，内容长度: ${fileContent.length}`);
                    const textHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>文件内容 - ${path.basename(urlContent)}</title>
                            <style>
                                body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                                pre { background: white; padding: 15px; border-radius: 5px; overflow: auto; }
                            </style>
                        </head>
                        <body>
                            <h2>文件: ${path.basename(urlContent)}</h2>
                            <pre>${this.escapeHtml(fileContent)}</pre>
                        </body>
                        </html>
                    `;
                    return {
                        type: 'url',
                        originalType: 'url',
                        subType: 'text-file',
                        path: urlContent,
                        content: textHtml
                    };
                }
            } catch (error) {
                throw new Error(`读取文件失败: ${error.message}`);
            }
        }

        throw new Error('无效的 URL 内容，必须是有效的网络 URL 或本地文件路径');
    }

    /**
     * 处理 Markdown 内容
     * @param {string} markdownContent - Markdown 字符串
     * @returns {Object} 处理结果
     */
    static processMarkdownContent(markdownContent) {
        console.log(`📄 处理 Markdown 内容，长度: ${markdownContent.length}`);

        // 将 Markdown 转换为 HTML
        const htmlContent = this.convertMarkdownToHtml(markdownContent);

        return {
            type: 'markdown',
            originalType: 'markdown',
            content: htmlContent
        };
    }

    /**
     * 处理图片内容
     * @param {string} imageContent - 图片路径或 base64 数据
     * @returns {Object} 处理结果
     */
    static processImageContent(imageContent) {
        // 检查是否是 base64 数据
        if (this.isBase64Image(imageContent)) {
            console.log(`🖼️ 检测到 base64 图片数据`);
            const imageHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>图片查看器</title>
                    <style>
                        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                        img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <img src="${imageContent}" alt="Base64 图片" />
                </body>
                </html>
            `;
            return {
                type: 'image',
                originalType: 'image',
                subType: 'base64',
                content: imageHtml
            };
        }

        // 检查是否是图片文件路径
        if (this.isImageFilePath(imageContent)) {
            console.log(`🖼️ 检测到图片文件路径: ${imageContent}`);
            try {
                const resolvedPath = path.resolve(imageContent);
                // 检查文件是否存在
                if (!fs.existsSync(resolvedPath)) {
                    throw new Error(`图片文件不存在: ${resolvedPath}`);
                }

                const imageHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>图片查看器 - ${path.basename(imageContent)}</title>
                        <style>
                            body { margin: 0; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                            h2 { color: #333; margin-bottom: 20px; }
                            img { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                        </style>
                    </head>
                    <body>
                        <h2>${path.basename(imageContent)}</h2>
                        <img src="file://${resolvedPath}" alt="${path.basename(imageContent)}" />
                    </body>
                    </html>
                `;
                return {
                    type: 'image',
                    originalType: 'image',
                    subType: 'file',
                    path: imageContent,
                    content: imageHtml
                };
            } catch (error) {
                throw new Error(`处理图片文件失败: ${error.message}`);
            }
        }

        throw new Error('无效的图片内容，必须是图片文件路径或 base64 数据');
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
     * 检查是否是网络 URL
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是网络 URL
     */
    static isNetworkUrl(input) {
        try {
            const url = new URL(input);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            return false;
        }
    }

    /**
     * 检查是否是本地文件路径
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是本地文件路径
     */
    static isLocalFilePath(input) {
        return typeof input === 'string' &&
            (input.includes('/') || input.includes('\\') || input.includes('.')) &&
            !this.isNetworkUrl(input) &&
            !input.includes('<') &&
            !input.includes('>');
    }

    /**
     * 检查是否是图片文件路径
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是图片文件路径
     */
    static isImageFilePath(input) {
        if (!this.isLocalFilePath(input)) {
            return false;
        }
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
        const ext = path.extname(input).toLowerCase();
        return imageExtensions.includes(ext);
    }

    /**
     * 检查是否是 base64 图片数据
     * @param {string} input - 输入字符串
     * @returns {boolean} 是否是 base64 图片数据
     */
    static isBase64Image(input) {
        return typeof input === 'string' &&
            input.startsWith('data:image/') &&
            input.includes('base64,');
    }

    /**
     * 转义 HTML 特殊字符
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * 将 Markdown 转换为 HTML（简单实现）
     * @param {string} markdown - Markdown 内容
     * @returns {string} HTML 内容
     */
    static convertMarkdownToHtml(markdown) {
        // 这是一个简单的 Markdown 转 HTML 实现
        // 在实际项目中，建议使用专业的 Markdown 解析库如 marked 或 markdown-it

        let html = markdown
            // 标题
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')

            // 粗体和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')

            // 代码块
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')

            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

            // 引用
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

            // 列表项
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')

            // 换行
            .replace(/\n/g, '<br>');

        // 包装列表项
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

        // 创建完整的 HTML 文档
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Markdown 内容</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        line-height: 1.6; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        background: #fff; 
                        color: #333; 
                    }
                    h1, h2, h3 { color: #2c3e50; margin-top: 30px; }
                    h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
                    code { 
                        background: #f8f9fa; 
                        padding: 2px 4px; 
                        border-radius: 3px; 
                        font-family: 'Monaco', 'Consolas', monospace; 
                    }
                    pre { 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 5px; 
                        overflow-x: auto; 
                        border-left: 4px solid #3498db; 
                    }
                    pre code { background: none; padding: 0; }
                    blockquote { 
                        border-left: 4px solid #3498db; 
                        margin: 0; 
                        padding-left: 20px; 
                        color: #7f8c8d; 
                        font-style: italic; 
                    }
                    ul { padding-left: 20px; }
                    li { margin: 5px 0; }
                    a { color: #3498db; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        return fullHtml;
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