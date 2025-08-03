const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

/**
 * 托盘服务
 * 负责管理系统托盘图标和菜单
 */
class TrayService {
    constructor(appStateService, windowService) {
        this.tray = null;
        this.appStateService = appStateService;
        this.windowService = windowService;
        
        // 监听服务器状态变化，自动更新托盘菜单
        this.appStateService.addListener('mcpServerInfo', () => {
            this.updateMenu();
        });

        console.log('✅ 托盘服务已初始化');
    }

    /**
     * 创建托盘
     */
    create() {
        if (this.tray) {
            console.log('⚠️ 托盘已存在，跳过创建');
            return;
        }

        try {
            const trayIcon = this.createTrayIcon();
            this.tray = new Tray(trayIcon);
            this.tray.setToolTip('NexusGUI - MCP 服务器控制台');
            
            this.setupEventListeners();
            this.updateMenu();
            
            console.log('✅ 系统托盘已创建');
        } catch (error) {
            console.error('❌ 创建托盘失败:', error);
            throw error;
        }
    }

    /**
     * 创建托盘图标
     * @returns {nativeImage} 托盘图标
     */
    createTrayIcon() {
        const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
        
        try {
            const trayIcon = nativeImage.createFromPath(iconPath);
            if (!trayIcon.isEmpty()) {
                return trayIcon;
            }
        } catch (error) {
            console.log('使用系统默认托盘图标');
        }

        // 使用系统默认图标
        if (process.platform === 'darwin') {
            return nativeImage.createFromNamedImage('NSStatusAvailable', [16, 16]);
        }
        
        return nativeImage.createEmpty();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 双击托盘图标显示缓存的 GUI（如果有的话）
        this.tray.on('double-click', async () => {
            console.log('🖱️ 托盘图标双击');
            try {
                if (global.showAppWindow) {
                    await global.showAppWindow();
                } else {
                    console.log('ℹ️ showAppWindow 函数不可用');
                }
            } catch (error) {
                console.error('❌ 双击托盘图标显示窗口失败:', error);
            }
        });

        // 右键点击显示菜单（某些系统需要）
        this.tray.on('right-click', () => {
            this.tray.popUpContextMenu();
        });
    }

    /**
     * 更新托盘菜单
     */
    updateMenu() {
        if (!this.tray) return;

        const serverInfo = this.appStateService.getState('mcpServerInfo');
        const serverStatus = serverInfo.status === 'running' ? '🟢 运行中' : '🔴 已停止';
        const serverPort = serverInfo.port || '未知';
        const activeSessions = this.getActiveSessionsCount();

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'NexusGUI MCP 服务器',
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: `状态: ${serverStatus}`,
                type: 'normal',
                enabled: false
            },
            {
                label: `端口: ${serverPort}`,
                type: 'normal',
                enabled: false
            },
            {
                label: `活动会话: ${activeSessions}`,
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: '📊 MCP 服务器控制台',
                type: 'normal',
                click: () => this.windowService.showMCPConsole()
            },
            {
                label: '🔧 调试信息窗口',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showDebugWindow()
            },
            {
                label: '🏥 健康检查',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showHealthCheck()
            },
            {
                label: '📋 会话管理',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showSessionManager()
            },
            { type: 'separator' },
            {
                label: '🔄 刷新状态',
                type: 'normal',
                click: () => this.refreshStatus()
            },
            {
                label: '⚙️ 服务器设置',
                type: 'normal',
                click: () => this.windowService.showServerSettings()
            },
            { type: 'separator' },
            {
                label: '🚪 退出',
                type: 'normal',
                click: () => {
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
    }

    /**
     * 获取活动会话数量
     * @returns {number} 活动会话数量
     */
    getActiveSessionsCount() {
        // 这里需要从MCP服务器获取实际的会话数量
        // 暂时返回模拟数据
        return 0;
    }

    /**
     * 刷新状态
     */
    refreshStatus() {
        console.log('🔄 刷新服务器状态...');
        this.updateMenu();
        
        // 刷新相关窗口
        if (this.windowService.refreshMCPConsoleWindows) {
            this.windowService.refreshMCPConsoleWindows();
        }
        
        console.log('✅ 服务器状态已刷新');
    }

    /**
     * 设置托盘提示文本
     * @param {string} tooltip - 提示文本
     */
    setTooltip(tooltip) {
        if (this.tray) {
            this.tray.setToolTip(tooltip);
        }
    }

    /**
     * 销毁托盘
     */
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('✅ 托盘已销毁');
        }
    }

    /**
     * 检查托盘是否存在
     * @returns {boolean} 托盘是否存在
     */
    exists() {
        return this.tray !== null;
    }

    /**
     * 显示托盘通知
     * @param {string} title - 通知标题
     * @param {string} content - 通知内容
     */
    showNotification(title, content) {
        if (this.tray) {
            this.tray.displayBalloon({
                title,
                content,
                icon: this.createTrayIcon()
            });
        }
    }
}

module.exports = { TrayService };