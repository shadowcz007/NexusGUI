const BaseToolHandler = require('./BaseToolHandler');
const monitorInfoSchema = require('../schemas/monitorInfoSchema');

/**
 * 实时监控信息工具
 * 用于获取服务器状态、系统资源使用情况等实时监控信息
 */
class MonitorInfoTool extends BaseToolHandler {
    constructor() {
        super(
            'monitor-info',
            [
                '获取服务器状态、系统资源使用情况等实时监控信息。',
                '显示 CPU 使用率、内存使用情况、系统负载等详细信息。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return monitorInfoSchema;
    }

    /**
     * 执行获取实时监控信息
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            this.log('info', '获取实时监控信息');

            // 检查主进程支持
            if (!global.appStateService || !global.serviceManager) {
                throw new Error('当前环境不支持获取实时监控信息，请在 Electron 主进程中运行。');
            }

            // 获取服务
            const serviceManager = global.serviceManager;
            const appStateService = global.appStateService;
            
            // 获取系统监控服务
            const systemMonitorService = serviceManager.getService('systemMonitor');
            if (!systemMonitorService) {
                throw new Error('系统监控服务不可用');
            }

            // 获取监控数据
            const monitorData = await systemMonitorService.getMonitorData();
            const serverInfo = appStateService.getState('mcpServerInfo');
            const networkStatus = appStateService.getState('networkStatus');

            // 构建返回信息
            const serverStatus = serverInfo.status === 'running' ? '🟢 运行中' : '🔴 已停止';
            const connectionStatus = networkStatus.connected ? '🔗 已连接' : '❌ 未连接';
            
            const infoLines = [
                '✅ 实时监控信息',
                '',
                '🖥️ 服务器状态:',
                `  状态: ${serverStatus}`,
                `  端口: ${serverInfo.port || '未知'}`,
                `  版本: ${serverInfo.version || '0.1.0'}`,
                serverInfo.startTime ? `  运行时间: ${this.formatTime((new Date() - new Date(serverInfo.startTime)) / 1000)}` : '',
                '',
                '🌐 网络状态:',
                `  连接状态: ${connectionStatus}`,
                `  活动会话: ${networkStatus.activeSessions || 0}`,
                networkStatus.lastActivity ? `  最后活动: ${new Date(networkStatus.lastActivity).toLocaleString('zh-CN')}` : '',
                '',
                '⚙️ CPU 使用情况:',
                `  使用率: ${monitorData.cpu.usage}%`,
                `  核心数: ${monitorData.cpu.cores}`,
                `  型号: ${monitorData.cpu.model.substring(0, 50)}${monitorData.cpu.model.length > 50 ? '...' : ''}`,
                '',
                '💾 内存使用情况:',
                `  使用率: ${monitorData.memory.usagePercent}%`,
                `  已使用: ${this.formatBytes(monitorData.memory.used)}`,
                `  总计: ${this.formatBytes(monitorData.memory.total)}`,
                `  可用: ${this.formatBytes(monitorData.memory.free)}`,
                '',
                '📈 系统负载:',
                `  1分钟: ${monitorData.load['1min'].toFixed(2)}`,
                `  5分钟: ${monitorData.load['5min'].toFixed(2)}`,
                `  15分钟: ${monitorData.load['15min'].toFixed(2)}`,
                '',
                'ℹ️ 系统信息:',
                `  平台: ${monitorData.system.platform} (${monitorData.system.arch})`,
                `  主机名: ${monitorData.system.hostname}`,
                `  系统版本: ${monitorData.system.version}`,
                `  运行时间: ${this.formatTime(monitorData.system.uptime)}`,
                '',
                `⏰ 数据获取时间: ${new Date(monitorData.timestamp).toLocaleString('zh-CN')}`
            ];

            return {
                content: [{
                    type: 'text',
                    text: infoLines.filter(line => line !== undefined).join('\n')
                }],
                monitorData: monitorData,
                serverInfo: serverInfo,
                networkStatus: networkStatus
            };
        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 格式化字节大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间
     */
    formatTime(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        let result = '';
        if (days > 0) result += days + '天 ';
        if (hours > 0) result += hours + '小时 ';
        if (minutes > 0) result += minutes + '分钟 ';
        result += seconds + '秒';

        return result.trim();
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化实时监控信息工具');

        // 检查主进程支持
        if (!global.appStateService) {
            this.log('warn', '主进程中未找到 appStateService，实时监控信息功能可能不可用');
        }
        
        if (!global.serviceManager) {
            this.log('warn', '主进程中未找到 serviceManager，实时监控信息功能可能不可用');
        }

        this.log('info', '实时监控信息工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理实时监控信息工具');
    }
}

module.exports = MonitorInfoTool;