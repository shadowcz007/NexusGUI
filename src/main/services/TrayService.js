const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const { settingsManager } = require('../../config/settings.js');

/**
 * 托盘服务
 * 负责管理系统托盘图标和菜单
 */
class TrayService {
    constructor(appStateService, windowService, loggerService, errorHandlerService) {
        this.tray = null;
        this.appStateService = appStateService;
        this.windowService = windowService;
        this.logger = loggerService.createModuleLogger('TRAY');
        this.errorHandler = errorHandlerService;

        // 监听服务器状态变化，自动更新托盘菜单
        this.appStateService.addListener('mcpServerInfo', () => {
            this.updateMenu();
        });

        // 监听网络状态变化，自动更新托盘菜单
        this.appStateService.addListener('networkStatus', () => {
            this.updateMenu();
        });

        this.logger.info('托盘服务已初始化');
    }

    /**
     * 创建托盘
     */
    async createTray() {
        if (this.tray) {
            this.logger.warn('托盘已存在，跳过创建');
            return;
        }

        try {
            const trayIcon = this.createTrayIcon();
            this.tray = new Tray(trayIcon);
            this.tray.setToolTip('NexusGUI - MCP 服务器控制台');

            this.setupEventListeners();
            this.updateMenu();

            this.logger.info('系统托盘已创建');
        } catch (error) {
            await this.errorHandler.handleError(error, {
                module: 'TRAY',
                operation: 'createTray'
            });
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
            this.logger.debug('使用系统默认托盘图标');
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
            this.logger.debug('托盘图标双击');
            try {
                if (global.showAppWindow) {
                    await global.showAppWindow();
                } else {
                    this.logger.info('showAppWindow 函数不可用');
                }
            } catch (error) {
                await this.errorHandler.handleError(error, {
                    module: 'TRAY',
                    operation: 'doubleClick'
                });
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
        const networkStatus = this.appStateService.getState('networkStatus');
        const serverStatus = serverInfo.status === 'running' ? '🟢 运行中' : '🔴 已停止';
        const serverPort = serverInfo.port || '未知';
        const activeSessions = networkStatus.activeSessions || 0;
        const isConnected = networkStatus.connected || false;
        const connectionStatus = isConnected ? '🔗 已连接' : '❌ 未连接';
        // 获取启动模式设置
        const startupMode = settingsManager.getSetting('startup.mode') || 'tray';
        // 获取自动窗口管理设置
        const autoWindowManagement = settingsManager.getSetting('ui.autoWindowManagement') || false;
        // 获取渲染历史记录
        const renderHistory = this.appStateService.getRenderHistory();

        // 构建工具窗口子菜单
        const toolsSubmenu = Menu.buildFromTemplate([
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
            {
                label: '🔍 调试控制台',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showDebugConsole()
            },
            {
                label: '📈 实时监控面板',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showMonitorDashboard()
            },
            {
                label: '🧪 API 测试工具',
                type: 'normal',
                enabled: serverInfo.status === 'running',
                click: () => this.windowService.showAPITestTool()
            }
        ]);

        // 构建历史记录子菜单
        const historySubmenu = [];
        if (renderHistory.length > 0) {
            renderHistory.slice(0, 8).forEach((item, index) => {
                historySubmenu.push({
                    label: `${index + 1}. ${this.truncateTitle(item.title)}`,
                    type: 'normal',
                    click: () => this.renderFromHistory(item.id)
                });
            });
        } else {
            historySubmenu.push({
                label: '暂无历史记录',
                type: 'normal',
                enabled: false
            });
        }

        // 构建快速测试子菜单
        const quickTestSubmenu = Menu.buildFromTemplate([
            {
                label: '基础测试界面',
                type: 'normal',
                click: () => this.runQuickTest('basic')
            },
            {
                label: '表单测试界面',
                type: 'normal',
                click: () => this.runQuickTest('form')
            },
            {
                label: '仪表板测试界面',
                type: 'normal',
                click: () => this.runQuickTest('dashboard')
            }
        ]);

        // 构建设置子菜单
        const settingsSubmenu = Menu.buildFromTemplate([
            {
                label: startupMode === 'tray' ? '🖥️ 切换到主窗口模式' : '📌 切换到托盘模式',
                type: 'normal',
                click: () => this.toggleStartupMode()
            },
            {
                label: autoWindowManagement ? '✅ 自动窗口管理' : '❌ 自动窗口管理',
                type: 'normal',
                click: () => this.toggleAutoWindowManagement()
            },
            { type: 'separator' },
            {
                label: '⚙️ 服务器设置',
                type: 'normal',
                click: () => this.windowService.showServerSettings()
            }
        ]);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: `NexusGUI ${serverStatus}`,
                type: 'normal',
                enabled: false
            },
            {
                label: `端口: ${serverPort} | 会话: ${activeSessions} | ${connectionStatus}`,
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: '📊 MCP 控制台',
                type: 'normal',
                click: () => this.windowService.showMCPConsole()
            },
            {
                label: '🛠️ 工具窗口',
                type: 'submenu',
                submenu: toolsSubmenu,
                enabled: serverInfo.status === 'running'
            },
            {
                label: '📜 历史记录',
                type: 'submenu',
                submenu: Menu.buildFromTemplate(historySubmenu)
            },
            {
                label: '🧪 快速测试',
                type: 'submenu',
                submenu: quickTestSubmenu
            },
            { type: 'separator' },
            {
                label: '🔄 刷新状态',
                type: 'normal',
                click: () => this.refreshStatus()
            },
            {
                label: '⚙️ 设置',
                type: 'submenu',
                submenu: settingsSubmenu
            },
            { type: 'separator' },
            {
                label: '🧹 关闭所有窗口',
                type: 'normal',
                click: () => this.closeAllDynamicWindows()
            },
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
     * 刷新状态
     */
    refreshStatus() {
        this.logger.info('刷新服务器状态...');
        this.updateMenu();

        // 刷新相关窗口
        if (this.windowService.refreshMCPConsoleWindows) {
            this.windowService.refreshMCPConsoleWindows();
        }

        this.logger.info('服务器状态已刷新');
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
            this.logger.info('托盘已销毁');
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

    /**
     * 切换启动模式
     */
    async toggleStartupMode() {
        try {
            // 获取当前启动模式
            const currentMode = settingsManager.getSetting('startup.mode') || 'tray';
            // 计算新模式
            const newMode = currentMode === 'tray' ? 'window' : 'tray';

            this.logger.info(`切换启动模式: ${currentMode} -> ${newMode}`);

            // 更新设置
            settingsManager.setSetting('startup.mode', newMode);

            // 更新托盘菜单
            this.updateMenu();

            // 如果新模式是主窗口模式，显示MCP控制台
            if (newMode === 'window') {
                await this.windowService.showMCPConsole();
            }

            this.logger.info(`启动模式已切换到: ${newMode}`);
        } catch (error) {
            this.logger.error('切换启动模式失败', { error: error.message });
        }
    }

    /**
     * 切换自动窗口管理
     */
    async toggleAutoWindowManagement() {
        try {
            // 获取当前设置
            const currentSetting = settingsManager.getSetting('ui.autoWindowManagement') || false;
            // 计算新设置
            const newSetting = !currentSetting;

            this.logger.info(`切换自动窗口管理: ${currentSetting} -> ${newSetting}`);

            // 更新设置
            settingsManager.setSetting('ui.autoWindowManagement', newSetting);

            // 更新托盘菜单
            this.updateMenu();

            this.logger.info(`自动窗口管理已切换到: ${newSetting}`);
        } catch (error) {
            this.logger.error('切换自动窗口管理失败', { error: error.message });
        }
    }

    /**
     * 关闭所有动态窗口
     */
    async closeAllDynamicWindows() {
        try {
            this.logger.info('关闭所有动态窗口');

            // 关闭所有窗口
            this.windowService.closeAll();

            this.logger.info('所有动态窗口已关闭');
        } catch (error) {
            this.logger.error('关闭所有动态窗口失败', { error: error.message });
        }
    }

    /**
     * 从历史记录渲染界面
     * @param {string} id - 历史记录ID
     */
    async renderFromHistory(id) {
        try {
            this.logger.info(`从历史记录渲染界面: ${id}`);

            // 获取历史记录项
            const historyItem = this.appStateService.getRenderHistoryItem(id);
            if (!historyItem) {
                this.logger.warn(`未找到历史记录项: ${id}`);
                return;
            }

            // 检查历史记录中是否有HTML内容
            if (historyItem.html && historyItem.hasHtml) {
                // 直接使用历史记录中的HTML内容
                const windowConfig = {
                    type: 'dynamic',
                    title: historyItem.config.title,
                    width: historyItem.config.width,
                    height: historyItem.config.height,
                    html: historyItem.html,
                    callbacks: historyItem.config.callbacks,
                    reuseWindow: true,
                    waitForResult: false
                };

                await global.createWindow(windowConfig);
                this.logger.info(`已从历史记录渲染界面: ${historyItem.config.title}`);
            } else {
                // 尝试从全局缓存获取（向后兼容）
                if (global.renderGuiCache &&
                    global.renderGuiCache.config.title === historyItem.config.title) {
                    const windowConfig = {
                        type: 'dynamic',
                        title: global.renderGuiCache.config.title,
                        width: global.renderGuiCache.config.width,
                        height: global.renderGuiCache.config.height,
                        html: global.renderGuiCache.html,
                        callbacks: global.renderGuiCache.config.callbacks,
                        reuseWindow: true,
                        waitForResult: false
                    };

                    await global.createWindow(windowConfig);
                    this.logger.info(`已从缓存渲染历史界面: ${historyItem.config.title}`);
                } else {
                    // 没有HTML内容，提示用户
                    this.showNotification(
                        '历史记录',
                        `无法重新渲染 "${historyItem.config.title}"，HTML内容已丢失。请重新使用render-gui工具渲染界面。`
                    );
                    this.logger.warn(`历史记录中没有HTML内容: ${historyItem.config.title}`);
                }
            }
        } catch (error) {
            this.logger.error('从历史记录渲染界面失败', { error: error.message });
        }
    }

    /**
     * 截断标题以适应托盘菜单显示
     * @param {string} title - 原始标题
     * @param {number} maxLength - 最大长度，如果不提供则从设置中读取
     * @returns {string} 截断后的标题
     */
    truncateTitle(title, maxLength) {
        if (!title || typeof title !== 'string') {
            return '未命名界面';
        }

        // 从设置中获取最大长度，默认30个字符
        if (maxLength === undefined) {
            maxLength = settingsManager.getSetting('ui.trayMenuTitleMaxLength') || 30;
        }

        // 如果标题长度小于等于最大长度，直接返回
        if (title.length <= maxLength) {
            return title;
        }

        // 计算前后保留的字符数
        const frontLength = Math.floor((maxLength - 3) / 2);
        const backLength = maxLength - 3 - frontLength;

        // 截断并添加省略号
        return `${title.substring(0, frontLength)}...${title.substring(title.length - backLength)}`;
    }

    /**
     * 运行快速测试
     * @param {string} testType - 测试类型
     */
    async runQuickTest(testType) {
        try {
            this.logger.info(`运行快速测试: ${testType}`);

            // 导入测试界面生成函数
            const { generateTestInterfaceHTML } = require('../html');

            // 生成测试界面HTML
            const testHtml = generateTestInterfaceHTML(testType);

            // 定义测试界面配置
            const testConfigs = {
                'basic': {
                    title: '基础测试界面',
                    width: 800,
                    height: 600
                },
                'form': {
                    title: '表单测试界面',
                    width: 600,
                    height: 700
                },
                'dashboard': {
                    title: '仪表板测试界面',
                    width: 1000,
                    height: 800
                }
            };

            const config = testConfigs[testType] || testConfigs['basic'];

            // 创建窗口配置
            const windowConfig = {
                type: 'dynamic',
                title: config.title,
                width: config.width,
                height: config.height,
                html: testHtml,
                data: {},
                callbacks: {},
                reuseWindow: true,
                waitForResult: false
            };

            // 创建窗口
            await global.createWindow(windowConfig);

            this.logger.info(`快速测试界面已渲染: ${config.title}`);
        } catch (error) {
            this.logger.error('运行快速测试失败', { error: error.message });
        }
    }
}

module.exports = { TrayService };