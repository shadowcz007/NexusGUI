const { McpRouterServer } = require('mcp_exe');
const MCPConfigManager = require('./integration/ConfigManager');

class MCPServerManager {
    constructor() {
        this.configManager = new MCPConfigManager();
        this.mcpServer = null;
        this.isRunning = false;
        this.initialized = false;
        // 从设置管理器获取端口，默认为3001
        this.port = this.getPortFromSettings();
    }

    getPortFromSettings() {
        try {
            // 尝试从设置管理器获取MCP服务器端口
            const { settingsManager } = require('../../config/settings.js');
            return settingsManager.getSetting('mcp.port') || 3001;
        } catch (error) {
            console.warn('无法从设置管理器获取MCP端口，使用默认端口3001:', error.message);
            return 3001;
        }
    }

    updatePort(newPort) {
        this.port = newPort;
        console.log(`MCP服务器端口已更新为: ${newPort}`);
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // 重新获取端口设置（以防设置已更改）
            this.port = this.getPortFromSettings();

            // 创建 MCP 服务器实例
            this.mcpServer = new McpRouterServer({
                name: 'nexusgui-mcp-server',
                version: '1.0.0',
                description: 'NexusGUI MCP 服务器'
            }, {
                transportType: 'sse',
                port: this.port
            });

            console.log('MCP 服务器实例创建成功');
            this.initialized = true;
        } catch (error) {
            console.error('MCP 服务器初始化失败:', error);
            throw error;
        }
    }

    async start() {
        await this.initialize();

        if (this.isRunning) {
            console.log('MCP 服务器已在运行中');
            return true;
        }

        try {
            // 获取用户配置
            const config = this.configManager.getUserConfig();

            // 导入配置
            await this.mcpServer.importMcpConfig(config, null);

            // 启动服务器
            await this.mcpServer.start();

            this.isRunning = true;
            console.log(`MCP 服务器已启动，端口: ${this.port}`);

            // 通知状态变更
            this.notifyStatusChange('running');

            return true;
        } catch (error) {
            console.error('MCP 服务器启动失败:', error);
            this.notifyStatusChange('error', error.message);
            throw error;
        }
    }

    async stop() {
        if (!this.isRunning || !this.mcpServer) {
            return true;
        }

        try {
            await this.mcpServer.close();
            this.isRunning = false;
            console.log('MCP 服务器已停止');

            this.notifyStatusChange('stopped');
            return true;
        } catch (error) {
            console.error('MCP 服务器停止失败:', error);
            throw error;
        }
    }

    async restart() {
        console.log('重启 MCP 服务器...');
        await this.stop();
        await this.start();
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            config: this.configManager.getUserConfig()
        };
    }

    notifyStatusChange(status, error = null) {
        if (global.mainWindow) {
            global.mainWindow.webContents.send('mcp-server-status', {
                status: status,
                error: error,
                port: this.port
            });
        }
    }
}

// 创建全局实例
const mcpServerManager = new MCPServerManager();

// 暴露给主进程
global.mcpServerManager = mcpServerManager;

module.exports = mcpServerManager;