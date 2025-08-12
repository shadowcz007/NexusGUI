const BaseToolHandler = require('./BaseToolHandler');
const networkStatusSchema = require('../schemas/networkStatusSchema');

/**
 * 网络状态工具
 * 用于获取与 AI 工具的连接状态和会话信息
 */
class NetworkStatusTool extends BaseToolHandler {
    constructor() {
        super(
            'network-status',
            [
                '获取与 AI 工具的连接状态和会话信息。',
                '显示服务器连接状态、活动会话数量等网络信息。'
            ].join('\n')
        );
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return networkStatusSchema;
    }

    /**
     * 执行获取网络状态
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        try {
            this.log('info', '获取网络状态信息');

            // 检查主进程支持
            if (!global.appStateService) {
                throw new Error('当前环境不支持获取网络状态，请在 Electron 主进程中运行。');
            }

            // 获取网络状态
            const networkStatus = global.appStateService.getState('networkStatus');
            const serverInfo = global.appStateService.getState('mcpServerInfo');

            // 构建返回信息
            const connectionStatus = networkStatus.connected ? '🟢 已连接' : '🔴 未连接';
            const serverStatus = serverInfo.status === 'running' ? '🟢 运行中' : '🔴 已停止';
            
            const statusLines = [
                '✅ 网络状态信息',
                `服务器状态: ${serverStatus}`,
                `连接状态: ${connectionStatus}`,
                `活动会话: ${networkStatus.activeSessions || 0}`,
                `总会话数: ${networkStatus.totalSessions || 0}`
            ];

            if (networkStatus.lastActivity) {
                const lastActivity = new Date(networkStatus.lastActivity).toLocaleString('zh-CN');
                statusLines.push(`最后活动: ${lastActivity}`);
            }

            return {
                content: [{
                    type: 'text',
                    text: statusLines.join('\n')
                }],
                networkStatus: networkStatus,
                serverInfo: serverInfo
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
        this.log('info', '初始化网络状态工具');

        // 检查主进程支持
        if (!global.appStateService) {
            this.log('warn', '主进程中未找到 appStateService，网络状态功能可能不可用');
        }

        this.log('info', '网络状态工具初始化完成');
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理网络状态工具');
    }
}

module.exports = NetworkStatusTool;