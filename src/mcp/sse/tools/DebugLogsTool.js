const BaseToolHandler = require('./BaseToolHandler');
const debugLogsSchema = require('../schemas/debugLogsSchema');

/**
 * 调试日志工具
 * 用于获取应用的调试日志信息
 */
class DebugLogsTool extends BaseToolHandler {
    constructor() {
        super(
            'debug-logs',
            [
                '获取应用的调试日志信息。',
                '支持指定日志行数和日志级别过滤。',
                '返回格式化的日志条目列表。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return debugLogsSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证lines参数
        if (args.lines !== undefined) {
            if (typeof args.lines !== 'number' || args.lines < 1 || args.lines > 1000) {
                throw new Error('lines 参数必须是 1-1000 之间的数字');
            }
        }

        // 验证level参数
        if (args.level !== undefined) {
            const validLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'ALL'];
            if (!validLevels.includes(args.level)) {
                throw new Error(`level 参数必须是 "${validLevels.join('", "')}" 中的一个`);
            }
        }

        return true;
    }

    /**
     * 执行获取调试日志
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            // 验证参数
            this.validate(args);

            this.log('info', '获取调试日志信息', { args });

            // 检查主进程支持
            if (!global.loggerService) {
                throw new Error('当前环境不支持获取调试日志，请在 Electron 主进程中运行。');
            }

            // 获取参数
            const lines = args.lines || 100;
            const level = args.level || 'ALL';

            // 获取日志
            let logs = global.loggerService.getRecentLogs(lines);

            // 根据级别过滤日志
            if (level !== 'ALL') {
                logs = logs.filter(log => log.level === level);
            }

            // 构建返回信息
            const logLines = logs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
                return `[${timestamp}] [${log.level.padEnd(5)}] [${log.module.padEnd(12)}] ${log.message}`;
            });

            // 如果日志太多，只显示前1000行
            const maxDisplayLines = 1000;
            let displayLogs = logLines;
            let truncated = false;
            
            if (logLines.length > maxDisplayLines) {
                displayLogs = logLines.slice(0, maxDisplayLines);
                truncated = true;
            }

            const responseLines = [
                `✅ 调试日志信息`,
                `📊 总日志数: ${logs.length}`,
                `📋 显示行数: ${displayLogs.length}${truncated ? ' (已截断)' : ''}`,
                `🔧 过滤级别: ${level}`,
                `📈 请求行数: ${lines}`,
                '',
                ...displayLogs
            ];

            return {
                content: [{
                    type: 'text',
                    text: responseLines.join('\n')
                }],
                logs: logs,
                stats: {
                    total: logs.length,
                    displayed: displayLogs.length,
                    truncated: truncated,
                    level: level,
                    requestedLines: lines
                }
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
        this.log('info', '初始化调试日志工具');

        // 检查主进程支持
        if (!global.loggerService) {
            this.log('warn', '主进程中未找到 loggerService，调试日志功能可能不可用');
        }

        this.log('info', '调试日志工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理调试日志工具');
    }
}

module.exports = DebugLogsTool;