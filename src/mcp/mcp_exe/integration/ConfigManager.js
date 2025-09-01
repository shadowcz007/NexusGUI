const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class MCPConfigManager {
    constructor() {
        this.userConfigPath = path.join(app.getPath('userData'), 'mcp-config.json');
        this.defaultConfigPath = path.join(__dirname, '../config/default-mcp.json');
    }

    // 获取用户配置
    getUserConfig() {
        try {
            // 首先尝试从设置管理器获取配置
            const { settingsManager } = require('../../../config/settings.js');
            const mcpConfig = settingsManager.getSetting('mcp.config');

            if (mcpConfig) {
                // 如果配置是字符串，解析为JSON
                if (typeof mcpConfig === 'string') {
                    return JSON.parse(mcpConfig);
                }
                // 如果已经是对象，直接返回
                return mcpConfig;
            }
        } catch (error) {
            console.warn('从设置管理器获取MCP配置失败，回退到文件配置:', error.message);
        }

        // 回退到文件配置
        try {
            if (fs.existsSync(this.userConfigPath)) {
                const config = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
                return config;
            }
        } catch (error) {
            console.error('读取用户配置失败:', error);
        }
        return this.getDefaultConfig();
    }

    // 保存用户配置
    saveUserConfig(config) {
        try {
            // 验证配置格式
            this.validateConfig(config);

            // 保存到设置管理器
            try {
                const { settingsManager } = require('../../../config/settings.js');
                settingsManager.setSetting('mcp.config', JSON.stringify(config, null, 2));
                console.log('MCP配置已保存到设置管理器');
            } catch (error) {
                console.warn('保存到设置管理器失败，回退到文件保存:', error.message);
                // 回退到文件保存
                fs.writeFileSync(this.userConfigPath, JSON.stringify(config, null, 2));
            }

            // 通知配置变更
            this.notifyConfigChange(config);

            return true;
        } catch (error) {
            console.error('保存用户配置失败:', error);
            throw error;
        }
    }

    // 获取默认配置
    getDefaultConfig() {
        try {
            // 首先尝试从设置管理器获取默认配置
            const { settingsManager } = require('../../../config/settings.js');
            const defaultMcpConfig = settingsManager.settings ?.mcp ?.config;

            if (defaultMcpConfig) {
                if (typeof defaultMcpConfig === 'string') {
                    return JSON.parse(defaultMcpConfig);
                }
                return defaultMcpConfig;
            }
        } catch (error) {
            console.warn('从设置管理器获取默认MCP配置失败，回退到文件配置:', error.message);
        }

        // 回退到文件配置
        try {
            return JSON.parse(fs.readFileSync(this.defaultConfigPath, 'utf8'));
        } catch (error) {
            console.error('读取默认配置失败:', error);
            return this.getMinimalConfig();
        }
    }

    // 最小配置模板
    getMinimalConfig() {
        return {
            "mcpServers": {
                "nexusgui-core": {
                    "url": "http://127.0.0.1:3000"
                }
            },
            "serverInfo": {
                "serverName": "nexusgui-mcp-server",
                "version": "1.0.0",
                "description": "NexusGUI MCP 服务器",
                "author": "shadow"
            },
            "tools": [],
            "namespace": ".",
            "toolChains": []
        };
    }

    // 验证配置格式
    validateConfig(config) {
        const requiredFields = ['mcpServers', 'serverInfo'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`配置缺少必需字段: ${field}`);
            }
        }

        if (!config.serverInfo.serverName) {
            throw new Error('serverInfo 中缺少 serverName 字段');
        }
    }

    // 通知配置变更
    notifyConfigChange(config) {
        // 通过 IPC 通知主进程配置已更新
        if (global.mainWindow) {
            global.mainWindow.webContents.send('mcp-config-updated', {
                success: true,
                config: config
            });
        }
    }
}

module.exports = MCPConfigManager;