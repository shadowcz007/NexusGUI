const fs = require('fs');
const path = require('path');
const os = require('os');
const TurndownService = require('turndown');

/**
 * Markdown 工具类
 * 提供 HTML 到 Markdown 的转换和文件管理功能
 */
class MarkdownUtils {
    /**
     * 获取 NexusGUI 缓存目录路径
     * @returns {string} 缓存目录路径
     */
    static getCacheDir() {
        const tempDir = os.tmpdir();
        const cacheDir = path.join(tempDir, 'nexusgui-cache');
        
        // 确保缓存目录存在
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        return cacheDir;
    }

    /**
     * 将 HTML 转换为 Markdown
     * @param {string} html - HTML 内容
     * @param {Object} options - 转换选项
     * @returns {string} Markdown 内容
     */
    static convertHtmlToMarkdown(html, options = {}) {
        if (!html || typeof html !== 'string') {
            throw new Error('HTML 内容不能为空且必须是字符串');
        }

        try {
            // 创建 Turndown 服务实例
            const turndownService = new TurndownService({
                // 标题样式：使用 ATX 风格 (# ## ###)
                headingStyle: 'atx',
                // 水平线样式
                hr: '---',
                // 项目符号样式
                bulletListMarker: '-',
                // 代码块围栏样式
                codeBlockStyle: 'fenced',
                // 围栏字符
                fence: '```',
                // 强调分隔符
                emDelimiter: '*',
                // 加粗分隔符
                strongDelimiter: '**',
                // 链接样式：内联
                linkStyle: 'inlined',
                // 链接引用样式
                linkReferenceStyle: 'full',
                // 保留换行符
                preformattedCode: false,
                ...options
            });

            // 添加自定义规则
            // 处理 div 标签
            turndownService.addRule('div', {
                filter: 'div',
                replacement: function(content, node) {
                    // 如果 div 包含块级内容，添加换行
                    const hasBlockContent = /<(h[1-6]|p|div|ul|ol|li|blockquote|pre|table|tr|td|th)[\s>]/i.test(node.innerHTML);
                    return hasBlockContent ? '\n\n' + content + '\n\n' : content;
                }
            });

            // 处理表格
            turndownService.addRule('table', {
                filter: 'table',
                replacement: function(content) {
                    return '\n\n' + content + '\n\n';
                }
            });

            // 处理表格行
            turndownService.addRule('tableRow', {
                filter: 'tr',
                replacement: function(content, node) {
                    const borderCells = content.trim().split('|');
                    const cells = borderCells.slice(1, -1); // 移除首尾的空字符串
                    
                    if (cells.length === 0) return '';
                    
                    const result = '| ' + cells.join(' | ') + ' |';
                    
                    // 如果是表头，添加分隔行
                    const isHeader = node.parentNode && node.parentNode.nodeName === 'THEAD';
                    if (isHeader) {
                        const separator = '\n| ' + cells.map(() => '---').join(' | ') + ' |';
                        return result + separator;
                    }
                    
                    return result;
                }
            });

            // 处理表格单元格
            turndownService.addRule('tableCell', {
                filter: ['td', 'th'],
                replacement: function(content) {
                    return ' ' + content.trim().replace(/\|/g, '\\|') + ' |';
                }
            });

            // 处理代码块
            turndownService.addRule('preCode', {
                filter: function(node) {
                    return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
                },
                replacement: function(content, node) {
                    const codeNode = node.firstChild;
                    const language = codeNode.className.match(/language-(\w+)/);
                    const lang = language ? language[1] : '';
                    return '\n\n```' + lang + '\n' + codeNode.textContent + '\n```\n\n';
                }
            });

            // 处理按钮（转换为文本）
            turndownService.addRule('button', {
                filter: 'button',
                replacement: function(content) {
                    return '**[' + content + ']**';
                }
            });

            // 预处理HTML，移除不需要的标签和内容
            let processedHtml = html
                // 移除 DOCTYPE 声明
                .replace(/<!DOCTYPE[^>]*>/gi, '')
                // 移除 script 和 style 标签及其内容
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                // 移除注释
                .replace(/<!--[\s\S]*?-->/g, '')
                // 提取并处理 title 标签
                .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, function(match) {
                    const titleMatch = match.match(/<title[^>]*>(.*?)<\/title>/i);
                    return titleMatch ? `<h1>${titleMatch[1]}</h1>` : '';
                })
                // 移除 html, body 等结构标签，但保留内容
                .replace(/<\/?(?:html|body)[^>]*>/gi, '')
                // 移除 meta, link 等自闭合标签
                .replace(/<(?:meta|link|base|area|col|embed|hr|img|input|source|track|wbr)[^>]*\/?>/gi, '')
                // 清理内联样式属性（保留标签结构）
                .replace(/\s+style="[^"]*"/gi, '')
                .replace(/\s+class="[^"]*"/gi, '')
                // 清理多余的空白字符，但保留必要的换行
                .replace(/[ \t]+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            // 使用 Turndown 转换
            const markdown = turndownService.turndown(processedHtml);
            
            // 后处理：清理和格式化 Markdown
            const cleanedMarkdown = markdown
                // 移除多余的空行
                .replace(/\n{4,}/g, '\n\n\n')
                // 移除行尾空白
                .replace(/[ \t]+$/gm, '')
                // 清理表格格式
                .replace(/\|\s*\|\s*\|/g, '| |')
                // 修复列表格式
                .replace(/^(\s*[-*+])\s+/gm, '$1 ')
                // 修复标题格式
                .replace(/^(#{1,6})\s*/gm, '$1 ')
                // 移除开头和结尾的多余换行
                .replace(/^\n+/, '')
                .replace(/\n+$/, '')
                .trim();

            return cleanedMarkdown;
        } catch (error) {
            throw new Error(`HTML 转 Markdown 失败: ${error.message}`);
        }
    }

    /**
     * 保存 Markdown 内容到临时目录
     * @param {string} markdown - Markdown 内容
     * @param {string} title - 文件标题（用于生成文件名）
     * @returns {Object} 保存结果
     */
    static saveMarkdownToTemp(markdown, title = 'gui-cache') {
        if (!markdown || typeof markdown !== 'string') {
            throw new Error('Markdown 内容不能为空且必须是字符串');
        }

        try {
            const cacheDir = this.getCacheDir();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-');
            
            // 生成文件名
            const filename = `${safeTitle}-${timestamp}.md`;
            const latestFilename = `${safeTitle}-latest.md`;
            
            const filePath = path.join(cacheDir, filename);
            const latestFilePath = path.join(cacheDir, latestFilename);

            // 保存 Markdown 文件
            fs.writeFileSync(filePath, markdown, 'utf8');
            
            // 创建或更新最新文件的符号链接/副本
            try {
                if (fs.existsSync(latestFilePath)) {
                    fs.unlinkSync(latestFilePath);
                }
                // 在 Windows 上创建副本，在 Unix 系统上创建符号链接
                if (process.platform === 'win32') {
                    fs.copyFileSync(filePath, latestFilePath);
                } else {
                    fs.symlinkSync(filename, latestFilePath);
                }
            } catch (linkError) {
                // 如果符号链接失败，创建副本
                fs.copyFileSync(filePath, latestFilePath);
            }

            const stats = fs.statSync(filePath);

            return {
                filePath: filePath,
                latestFilePath: latestFilePath,
                filename: filename,
                size: stats.size,
                created: stats.birthtime,
                directory: cacheDir,
                success: true
            };

        } catch (error) {
            throw new Error(`保存 Markdown 文件失败: ${error.message}`);
        }
    }

    /**
     * 读取 Markdown 文件内容
     * @param {string} filePath - 文件路径
     * @returns {Object} 文件内容和元信息
     */
    static readMarkdownFile(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('文件路径不能为空且必须是字符串');
        }

        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const stats = fs.statSync(filePath);

            return {
                content: content,
                filePath: filePath,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                lines: content.split('\n').length,
                success: true
            };

        } catch (error) {
            throw new Error(`读取 Markdown 文件失败: ${error.message}`);
        }
    }

    /**
     * 获取缓存目录中的所有 Markdown 文件
     * @returns {Array} 文件列表
     */
    static listCachedMarkdownFiles() {
        try {
            const cacheDir = this.getCacheDir();
            
            if (!fs.existsSync(cacheDir)) {
                return [];
            }

            const files = fs.readdirSync(cacheDir)
                .filter(file => file.endsWith('.md'))
                .map(file => {
                    const filePath = path.join(cacheDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        filename: file,
                        filePath: filePath,
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime,
                        isLatest: file.includes('-latest.md')
                    };
                })
                .sort((a, b) => b.modified - a.modified); // 按修改时间降序排列

            return files;

        } catch (error) {
            throw new Error(`获取缓存文件列表失败: ${error.message}`);
        }
    }

    /**
     * 清理过期的临时 Markdown 文件
     * @param {number} maxAge - 最大保留时间（毫秒），默认7天
     * @param {number} maxFiles - 最大保留文件数，默认50个
     * @returns {Object} 清理结果
     */
    static cleanupTempFiles(maxAge = 7 * 24 * 60 * 60 * 1000, maxFiles = 50) {
        try {
            const cacheDir = this.getCacheDir();
            
            if (!fs.existsSync(cacheDir)) {
                return { deletedCount: 0, totalSize: 0, success: true };
            }

            const files = this.listCachedMarkdownFiles()
                .filter(file => !file.isLatest); // 不删除 latest 文件

            const now = new Date();
            let deletedCount = 0;
            let totalSize = 0;

            // 按时间清理过期文件
            const expiredFiles = files.filter(file => {
                const age = now - new Date(file.modified);
                return age > maxAge;
            });

            // 按数量清理多余文件（保留最新的 maxFiles 个）
            const excessFiles = files.length > maxFiles 
                ? files.slice(maxFiles) 
                : [];

            // 合并需要删除的文件（去重）
            const filesToDelete = [...new Set([
                ...expiredFiles.map(f => f.filePath),
                ...excessFiles.map(f => f.filePath)
            ])];

            // 执行删除
            filesToDelete.forEach(filePath => {
                try {
                    const stats = fs.statSync(filePath);
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    totalSize += stats.size;
                } catch (deleteError) {
                    console.warn(`删除文件失败: ${filePath}`, deleteError.message);
                }
            });

            return {
                deletedCount,
                totalSize,
                remainingFiles: files.length - deletedCount,
                success: true
            };

        } catch (error) {
            throw new Error(`清理临时文件失败: ${error.message}`);
        }
    }

    /**
     * 获取缓存目录信息
     * @returns {Object} 目录信息
     */
    static getCacheInfo() {
        try {
            const cacheDir = this.getCacheDir();
            const files = this.listCachedMarkdownFiles();
            
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            const latestFile = files.find(file => file.isLatest);

            return {
                cacheDir: cacheDir,
                totalFiles: files.length,
                totalSize: totalSize,
                latestFile: latestFile || null,
                files: files,
                success: true
            };

        } catch (error) {
            throw new Error(`获取缓存信息失败: ${error.message}`);
        }
    }

    /**
     * 验证 Markdown 内容
     * @param {string} markdown - Markdown 内容
     * @returns {Object} 验证结果
     */
    static validateMarkdown(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return {
                valid: false,
                error: 'Markdown 内容不能为空且必须是字符串'
            };
        }

        try {
            const lines = markdown.split('\n');
            const wordCount = markdown.split(/\s+/).filter(word => word.length > 0).length;
            const hasHeaders = /^#+\s/.test(markdown);
            const hasLinks = /\[.*?\]\(.*?\)/.test(markdown);
            const hasCodeBlocks = /```/.test(markdown);

            return {
                valid: true,
                stats: {
                    lines: lines.length,
                    characters: markdown.length,
                    words: wordCount,
                    hasHeaders,
                    hasLinks,
                    hasCodeBlocks
                }
            };

        } catch (error) {
            return {
                valid: false,
                error: `Markdown 验证失败: ${error.message}`
            };
        }
    }
}

module.exports = MarkdownUtils;