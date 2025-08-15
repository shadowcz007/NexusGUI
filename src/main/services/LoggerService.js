const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 统一日志服务
 * 提供分级日志记录、文件输出、格式化等功能
 */
class LoggerService {
    constructor(options = {}) {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        this.currentLevel = options.level || this.levels.INFO;
        this.enableFileLogging = options.enableFileLogging || false;
        this.logDir = options.logDir || this.getSystemLogDirectory();
        this.maxLogFiles = options.maxLogFiles || 5;
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        
        // 创建日志目录
        if (this.enableFileLogging) {
            this.ensureLogDirectory();
        }
        
        // 日志统计
        this.stats = {
            error: 0,
            warn: 0,
            info: 0,
            debug: 0
        };
        
        console.log('✅ 日志服务已初始化');
    }
    
    /**
     * 获取系统日志目录
     * @returns {string} 系统日志目录路径
     */
    getSystemLogDirectory() {
        try {
            // 优先使用 Electron 的 logs 目录
            if (app && app.getPath) {
                const logsPath = app.getPath('logs');
                return path.join(logsPath, 'NexusGUI');
            }
            
            // 如果 app 不可用，使用用户数据目录
            if (app && app.getPath) {
                const userDataPath = app.getPath('userData');
                return path.join(userDataPath, 'logs');
            }
            
            // 降级方案：使用系统临时目录
            const os = require('os');
            return path.join(os.tmpdir(), 'NexusGUI', 'logs');
            
        } catch (error) {
            console.warn('获取系统日志目录失败，使用默认路径:', error);
            // 最终降级方案
            return path.join(process.cwd(), 'logs');
        }
    }

    /**
     * 确保日志目录存在
     */
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log(`✅ 创建日志目录: ${this.logDir}`);
            }
        } catch (error) {
            console.error('创建日志目录失败:', error);
            // 尝试使用备用目录
            try {
                const fallbackDir = path.join(process.cwd(), 'logs');
                this.logDir = fallbackDir;
                if (!fs.existsSync(fallbackDir)) {
                    fs.mkdirSync(fallbackDir, { recursive: true });
                    console.log(`✅ 使用备用日志目录: ${fallbackDir}`);
                }
            } catch (fallbackError) {
                console.error('创建备用日志目录也失败:', fallbackError);
                this.enableFileLogging = false;
                console.warn('⚠️ 文件日志已自动禁用');
            }
        }
    }
    
    /**
     * 错误级别日志
     * @param {string} message - 日志消息
     * @param {object} context - 上下文信息
     * @param {string} module - 模块名称
     */
    error(message, context = {}, module = 'SYSTEM') {
        this.stats.error++;
        this.log('ERROR', message, context, module);
    }
    
    /**
     * 警告级别日志
     * @param {string} message - 日志消息
     * @param {object} context - 上下文信息
     * @param {string} module - 模块名称
     */
    warn(message, context = {}, module = 'SYSTEM') {
        this.stats.warn++;
        this.log('WARN', message, context, module);
    }
    
    /**
     * 信息级别日志
     * @param {string} message - 日志消息
     * @param {object} context - 上下文信息
     * @param {string} module - 模块名称
     */
    info(message, context = {}, module = 'SYSTEM') {
        this.stats.info++;
        this.log('INFO', message, context, module);
    }
    
    /**
     * 调试级别日志
     * @param {string} message - 日志消息
     * @param {object} context - 上下文信息
     * @param {string} module - 模块名称
     */
    debug(message, context = {}, module = 'SYSTEM') {
        this.stats.debug++;
        this.log('DEBUG', message, context, module);
    }
    
    /**
     * 核心日志记录方法
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {object} context - 上下文信息
     * @param {string} module - 模块名称
     */
    log(level, message, context = {}, module = 'SYSTEM') {
        if (this.levels[level] > this.currentLevel) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 ? 
            JSON.stringify(context, null, 2) : '';
        
        // 格式化日志消息
        const logEntry = this.formatLogEntry(timestamp, level, module, message, contextStr);
        
        // 控制台输出（带颜色）
        this.outputToConsole(level, logEntry);
        
        // 文件输出
        if (this.enableFileLogging) {
            this.outputToFile(level, logEntry);
        }
    }
    
    /**
     * 格式化日志条目
     * @param {string} timestamp - 时间戳
     * @param {string} level - 日志级别
     * @param {string} module - 模块名称
     * @param {string} message - 消息
     * @param {string} context - 上下文
     * @returns {string} 格式化的日志条目
     */
    formatLogEntry(timestamp, level, module, message, context) {
        const paddedLevel = level.padEnd(5);
        const paddedModule = module.padEnd(12);
        
        let logEntry = `[${timestamp}] [${paddedLevel}] [${paddedModule}] ${message}`;
        
        if (context) {
            logEntry += `\n${context}`;
        }
        
        return logEntry;
    }
    
    /**
     * 控制台输出（带颜色）
     * @param {string} level - 日志级别
     * @param {string} logEntry - 日志条目
     */
    outputToConsole(level, logEntry) {
        const colors = {
            ERROR: '\x1b[31m', // 红色
            WARN: '\x1b[33m',  // 黄色
            INFO: '\x1b[36m',  // 青色
            DEBUG: '\x1b[37m'  // 白色
        };
        
        const resetColor = '\x1b[0m';
        const coloredEntry = `${colors[level]}${logEntry}${resetColor}`;
        
        if (level === 'ERROR') {
            console.error(coloredEntry);
        } else {
            console.log(coloredEntry);
        }
    }
    
    /**
     * 文件输出
     * @param {string} level - 日志级别
     * @param {string} logEntry - 日志条目
     */
    outputToFile(level, logEntry) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFileName = `nexusgui-${today}.log`;
            const logFilePath = path.join(this.logDir, logFileName);
            
            // 检查文件大小，如果超过限制则轮转
            if (fs.existsSync(logFilePath)) {
                const stats = fs.statSync(logFilePath);
                if (stats.size > this.maxLogSize) {
                    this.rotateLogFile(logFilePath);
                }
            }
            
            // 写入日志文件
            fs.appendFileSync(logFilePath, logEntry + '\n', 'utf8');
            
        } catch (error) {
            console.error('写入日志文件失败:', error);
        }
    }
    
    /**
     * 日志文件轮转
     * @param {string} logFilePath - 日志文件路径
     */
    rotateLogFile(logFilePath) {
        try {
            const dir = path.dirname(logFilePath);
            const basename = path.basename(logFilePath, '.log');
            
            // 移动现有文件
            for (let i = this.maxLogFiles - 1; i > 0; i--) {
                const oldFile = path.join(dir, `${basename}.${i}.log`);
                const newFile = path.join(dir, `${basename}.${i + 1}.log`);
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxLogFiles - 1) {
                        fs.unlinkSync(oldFile); // 删除最老的文件
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            
            // 重命名当前文件
            const rotatedFile = path.join(dir, `${basename}.1.log`);
            fs.renameSync(logFilePath, rotatedFile);
            
        } catch (error) {
            console.error('日志文件轮转失败:', error);
        }
    }
    
    /**
     * 设置日志级别
     * @param {string} level - 日志级别名称
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
            this.info(`日志级别已设置为: ${level}`, {}, 'LOGGER');
        } else {
            this.warn(`无效的日志级别: ${level}`, {}, 'LOGGER');
        }
    }
    
    /**
     * 启用/禁用文件日志
     * @param {boolean} enabled - 是否启用
     */
    setFileLogging(enabled) {
        this.enableFileLogging = enabled;
        if (enabled) {
            this.ensureLogDirectory();
            this.info('文件日志已启用', {}, 'LOGGER');
        } else {
            this.info('文件日志已禁用', {}, 'LOGGER');
        }
    }
    
    /**
     * 获取日志统计信息
     * @returns {object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            currentLevel: this.levelNames[this.currentLevel],
            fileLoggingEnabled: this.enableFileLogging,
            logDirectory: this.logDir
        };
    }
    
    /**
     * 清理日志统计
     */
    clearStats() {
        this.stats = {
            error: 0,
            warn: 0,
            info: 0,
            debug: 0
        };
        this.info('日志统计已清理', {}, 'LOGGER');
    }
    
    /**
     * 创建子日志器（带模块名称）
     * @param {string} moduleName - 模块名称
     * @returns {object} 子日志器
     */
    createModuleLogger(moduleName) {
        return {
            error: (message, context = {}) => this.error(message, context, moduleName),
            warn: (message, context = {}) => this.warn(message, context, moduleName),
            info: (message, context = {}) => this.info(message, context, moduleName),
            debug: (message, context = {}) => this.debug(message, context, moduleName)
        };
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        this.info('日志服务正在清理...', {}, 'LOGGER');
        // 这里可以添加清理逻辑，比如关闭文件句柄等
    }
    
    /**
     * 获取最新的日志内容
     * @param {number} lines - 要获取的日志行数
     * @returns {Array} 日志条目数组
     */
    getRecentLogs(lines = 100) {
        try {
            if (!this.enableFileLogging) {
                return [{
                    timestamp: new Date().toISOString(),
                    level: 'WARN',
                    module: 'LOGGER',
                    message: '文件日志未启用，无法获取历史日志',
                    context: {}
                }];
            }
            
            const today = new Date().toISOString().split('T')[0];
            const logFileName = `nexusgui-${today}.log`;
            const logFilePath = path.join(this.logDir, logFileName);
            
            if (!fs.existsSync(logFilePath)) {
                return [{
                    timestamp: new Date().toISOString(),
                    level: 'INFO',
                    module: 'LOGGER',
                    message: '今日暂无日志文件',
                    context: {}
                }];
            }
            
            // 读取文件内容
            const content = fs.readFileSync(logFilePath, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim() !== '');
            
            // 获取最后N行
            const recentLines = logLines.slice(-lines);
            
            // 解析日志行
            const logs = [];
            for (const line of recentLines) {
                // 尝试解析日志格式
                const logMatch = line.match(/\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)/);
                if (logMatch) {
                    logs.push({
                        timestamp: logMatch[1],
                        level: logMatch[2].trim(),
                        module: logMatch[3].trim(),
                        message: logMatch[4],
                        context: {}
                    });
                } else {
                    // 如果无法解析格式，作为普通消息处理
                    logs.push({
                        timestamp: new Date().toISOString(),
                        level: 'INFO',
                        module: 'LOGGER',
                        message: line,
                        context: {}
                    });
                }
            }
            
            return logs;
        } catch (error) {
            return [{
                timestamp: new Date().toISOString(),
                level: 'ERROR',
                module: 'LOGGER',
                message: `获取日志失败: ${error.message}`,
                context: {}
            }];
        }
    }
    
    /**
     * 获取日志文件列表
     * @returns {Array} 日志文件信息数组
     */
    getLogFiles() {
        try {
            if (!this.enableFileLogging) {
                return [];
            }
            
            if (!fs.existsSync(this.logDir)) {
                return [];
            }
            
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.startsWith('nexusgui-') && file.endsWith('.log'))
                .map(file => {
                    const filePath = path.join(this.logDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime
                    };
                })
                .sort((a, b) => b.modified - a.modified);
            
            return files;
        } catch (error) {
            this.error(`获取日志文件列表失败: ${error.message}`, {}, 'LOGGER');
            return [];
        }
    }
}

module.exports = { LoggerService };