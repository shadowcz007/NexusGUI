const { initializeSSEMCPServer } = require('../../mcp/sse/wrapper.js');
const { settingsManager } = require('../../config/settings.js');

/**
 * 服务器服务
 * 负责管理 SSE MCP 服务器的启动、停止和状态管理
 */
class ServerService {
    constructor(appStateService) {
        this.sseServer = null;
        this.appStateService = appStateService;
        console.log('✅ 服务器服务已初始化');
    }

    /**
     * 启动服务器
     * @param {number} port - 服务器端口，不传则使用配置中的端口
     * @returns {Promise<boolean>} 启动是否成功
     */
    async start(port = null) {
        try {
            // 如果服务器已运行，先停止
            if (this.sseServer) {
                console.log('⚠️ 服务器已运行，先停止现有服务器');
                await this.stop();
            }

            const serverPort = port || settingsManager.getSetting('server.port') || 3000;
            
            console.log(`🚀 正在启动 SSE MCP 服务器，端口: ${serverPort}`);

            // 更新状态为启动中
            this.appStateService.updateServerInfo({
                status: 'starting',
                port: serverPort,
                error: null,
                startTime: new Date().toISOString()
            });

            // 初始化服务器
            const { sseServer: createSSEServer } = await initializeSSEMCPServer();
            this.sseServer = createSSEServer(serverPort);

            // 更新状态为运行中
            this.appStateService.updateServerInfo({
                status: 'running',
                port: serverPort,
                endpoints: [
                    { name: 'SSE 连接', path: '/mcp', description: '建立 Server-Sent Events 连接' },
                    { name: '消息处理', path: '/messages', description: '处理 JSON-RPC 消息' },
                    { name: '健康检查', path: '/health', description: '服务器状态检查' },
                    { name: '调试信息', path: '/debug/sessions', description: '查看活动会话' }
                ],
                error: null
            });

            console.log('✅ SSE MCP 服务器启动成功');
            return true;

        } catch (error) {
            console.error('❌ SSE MCP 服务器启动失败:', error);
            
            this.appStateService.updateServerInfo({
                status: 'failed',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * 停止服务器
     * @returns {Promise<boolean>} 停止是否成功
     */
    async stop() {
        if (this.sseServer) {
            try {
                console.log('🛑 正在停止 SSE MCP 服务器...');
                
                this.appStateService.updateServerInfo({
                    status: 'stopping'
                });

                this.sseServer.close();
                this.sseServer = null;

                this.appStateService.updateServerInfo({
                    status: 'stopped',
                    error: null
                });

                console.log('✅ SSE MCP 服务器已停止');
                return true;
            } catch (error) {
                console.error('❌ 停止服务器时出错:', error);
                this.appStateService.updateServerInfo({
                    status: 'failed',
                    error: error.message
                });
                throw error;
            }
        }
        return true;
    }

    /**
     * 重启服务器
     * @param {number} newPort - 新的端口号
     * @returns {Promise<boolean>} 重启是否成功
     */
    async restart(newPort = null) {
        console.log('🔄 重启服务器...');
        await this.stop();
        await this.start(newPort);
        console.log('✅ 服务器重启完成');
        return true;
    }

    /**
     * 获取服务器状态
     * @returns {object} 服务器状态信息
     */
    getStatus() {
        return this.appStateService.getState('mcpServerInfo');
    }

    /**
     * 检查服务器是否运行
     * @returns {boolean} 服务器是否运行中
     */
    isRunning() {
        return this.sseServer !== null && this.getStatus().status === 'running';
    }

    /**
     * 获取服务器端口
     * @returns {number|null} 服务器端口
     */
    getPort() {
        return this.getStatus().port;
    }

    /**
     * 获取服务器实例
     * @returns {object|null} 服务器实例
     */
    getServerInstance() {
        return this.sseServer;
    }

    /**
     * 清理资源
     */
    cleanup() {
        console.log('🧹 清理服务器服务...');
        if (this.sseServer) {
            try {
                this.sseServer.close();
                this.sseServer = null;
                console.log('✅ 服务器已关闭');
            } catch (error) {
                console.error('❌ 关闭服务器时出错:', error);
            }
        }
        console.log('✅ 服务器服务已清理');
    }
}

module.exports = { ServerService };