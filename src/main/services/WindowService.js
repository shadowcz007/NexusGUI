const { BrowserWindow } = require('electron');
const path = require('path');

const {
    generateSessionManagerHTML,
    generateDebugWindowHTML,
    generateMCPDashboardHTML,
    generateServerSettingsHTML,
    generateAPITestToolHTML
} = require('../html/index.js');

/**
 * 窗口服务
 * 负责管理所有窗口的创建、显示和生命周期
 */
class WindowService {
    constructor(appStateService, serverService, loggerService, errorHandlerService) {
        this.appStateService = appStateService;
        this.serverService = serverService;
        this.loggerService = loggerService; // Store the main logger service
        this.logger = loggerService.createModuleLogger('WINDOW');
        this.errorHandler = errorHandlerService;
        this.logger.info('窗口服务已初始化');
    }

    /**
     * 统一的窗口创建函数
     * @param {object} config - 窗口配置
     * @returns {Promise<BrowserWindow|object>} 窗口对象或结果
     */
    async createWindow(config = {}) {
        // 创建一个 Promise 用于同步等待窗口结果
        let resolveWindowResult;
        const windowResultPromise = config.waitForResult ? new Promise(resolve => {
            resolveWindowResult = resolve;
        }) : null;

        this.logger.debug('开始创建窗口...', { config });

        // 检查是否复用现有窗口
        // 优先使用配置中的 reuseWindow 设置，如果没有则检查自动窗口管理设置
        const settingsManager = require('../../config/settings.js').settingsManager;
        const autoWindowManagement = settingsManager.getSetting('ui.autoWindowManagement');
        const reuseWindow = config.reuseWindow !== undefined ? config.reuseWindow : autoWindowManagement;

        if (reuseWindow) {
            const existingWindow = await this.tryReuseWindow(config);
            if (existingWindow) {
                return existingWindow;
            }
        } else {
            // 检查并关闭现有窗口
            await this.closeExistingWindows();
        }

        // 创建新窗口
        const win = await this.createNewWindow(config);

        // 如果需要等待结果，存储解析器到窗口对象
        if (config.waitForResult && resolveWindowResult) {
            win.windowResultResolver = resolveWindowResult;
        }

        // 将窗口添加到状态管理
        const windowId = config.id || `window_${Date.now()}`;
        this.appStateService.addWindow(windowId, win);

        // 监听窗口关闭事件
        win.on('closed', () => {
            this.appStateService.removeWindow(windowId);

            // 如果窗口有结果解析器但尚未解析，则在窗口关闭时解析
            if (win.windowResultResolver) {
                win.windowResultResolver({
                    action: 'close',
                    data: null
                });
            }
        });

        // 如果需要等待结果，返回 Promise，否则返回窗口对象
        if (config.waitForResult) {
            this.logger.debug('等待窗口结果...');
            const result = await windowResultPromise;
            this.logger.debug('收到窗口结果', { result });
            return result;
        } else {
            return win;
        }
    }

    /**
     * 尝试复用现有窗口
     * @param {object} config - 窗口配置
     * @returns {Promise<BrowserWindow|null>} 复用的窗口或null
     */
    async tryReuseWindow(config) {
        const existingWindows = BrowserWindow.getAllWindows();
        if (existingWindows.length > 0) {
            console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，尝试复用...`);

            // 找到第一个可用的窗口
            for (const win of existingWindows) {
                if (!win.isDestroyed()) {
                    console.log(`✅ 复用现有窗口: ${win.getTitle()}`);

                    // 更新窗口配置
                    this.updateWindowConfig(win, config);

                    // 重新加载内容
                    try {
                        await this.loadWindowContent(win, config);
                        this.showWindow(win, config);
                        return win;
                    } catch (error) {
                        console.error('❌ 复用窗口时加载内容失败:', error);
                        // 如果复用失败，继续创建新窗口
                    }
                }
            }
        }
        return null;
    }

    /**
     * 关闭现有窗口
     */
    async closeExistingWindows() {
        const existingWindows = BrowserWindow.getAllWindows();
        if (existingWindows.length > 0) {
            console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，正在关闭...`);
            for (const win of existingWindows) {
                if (!win.isDestroyed()) {
                    win.close();
                }
            }
            // 等待窗口关闭
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * 创建新窗口
     * @param {object} config - 窗口配置
     * @returns {Promise<BrowserWindow>} 新创建的窗口
     */
    async createNewWindow(config) {
        // 窗口属性配置
        const windowConfig = {
            width: config.width || 800,
            height: config.height || 600,
            title: config.title || 'NexusGUI - 动态界面',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js')
            },
            show: false,
            titleBarStyle: config.showMenuBar === false ? 'hidden' : 'default',
            icon: path.join(__dirname, '../assets', 'icon.png'),
            center: true,
            minWidth: config.minWidth || 400,
            minHeight: config.minHeight || 300,
            maxWidth: config.maxWidth,
            maxHeight: config.maxHeight,
            alwaysOnTop: config.alwaysOnTop || false,
            skipTaskbar: config.skipTaskbar || false,
            showInTaskbar: config.showInTaskbar !== false,
            x: config.x,
            y: config.y,
            frame: config.frame !== false,
            titleBarStyle: config.titleBarStyle || 'default',
            resizable: config.resizable !== false,
            movable: config.movable !== false,
            minimizable: config.minimizable !== false,
            maximizable: config.maximizable !== false,
            closable: config.closable !== false,
            opacity: config.opacity,
            type: config.windowType || 'normal',
            fullscreen: config.fullscreen || false,
            zoomFactor: config.zoomFactor
        };

        console.log('🔍 创建窗口:', config);
        console.log('📱 窗口配置:', windowConfig);

        const win = new BrowserWindow(windowConfig);

        // 设置窗口的固定状态
        win.isPinned = config.pinned || false;

        // 加载窗口内容
        await this.loadWindowContent(win, config);

        // 设置窗口显示逻辑
        this.setupWindowDisplay(win, config);

        // 设置开发者工具
        if (process.argv.includes('--dev')) {
            win.webContents.openDevTools();
            console.log('🔧 开发者工具已打开');
        }

        return win;
    }

    /**
     * 更新窗口配置
     * @param {BrowserWindow} win - 窗口对象
     * @param {object} config - 配置对象
     */
    updateWindowConfig(win, config) {
        if (config.width && config.height) {
            win.setSize(config.width, config.height);
        }
        if (config.title) {
            win.setTitle(config.title);
        }
        if (config.alwaysOnTop !== undefined) {
            win.setAlwaysOnTop(config.alwaysOnTop);
        }
        if (config.opacity !== undefined) {
            win.setOpacity(config.opacity);
        }
        if (config.fullscreen !== undefined) {
            win.setFullScreen(config.fullscreen);
        }
        if (config.zoomFactor !== undefined) {
            win.webContents.setZoomFactor(config.zoomFactor);
        }
    }

    /**
     * 加载窗口内容
     * @param {BrowserWindow} win - 窗口对象
     * @param {object} config - 配置对象
     */
    async loadWindowContent(win, config) {
        try {
            if (config.html) {
                console.log('📄 使用 HTML 模式渲染');
                win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(config.html)}`);
                console.log('✅ HTML 内容已直接加载到渲染窗口');
            } else if (config.url) {
                console.log('🌐 使用 URL 模式渲染:', config.url);
                await win.loadURL(config.url);
                console.log('✅ URL 内容已直接加载到渲染窗口');
            } else {
                await win.loadFile(path.join(__dirname, '../renderer/index.html'));
                console.log('✅ HTML 文件加载成功');
            }
        } catch (error) {
            console.error('❌ 内容加载失败:', error);
            throw error;
        }
    }

    /**
     * 设置窗口显示逻辑
     * @param {BrowserWindow} win - 窗口对象
     * @param {object} config - 配置对象
     */
    setupWindowDisplay(win, config) {
        let isWindowShown = false;

        // 等待页面加载完成后发送配置
        win.webContents.once('did-finish-load', () => {
            console.log('✅ 页面加载完成，发送配置到渲染进程');

            if (!isWindowShown) {
                isWindowShown = true;
                this.showWindow(win, config);
            }
        });

        // 添加超时机制，如果页面加载超时，强制显示窗口
        setTimeout(() => {
            if (!isWindowShown) {
                console.log('⚠️ 页面加载超时，强制显示窗口');
                isWindowShown = true;
                this.showWindow(win, config);
            }
        }, 3000); // 3秒超时

        // 调试页面加载
        this.setupWindowDebugEvents(win);
    }

    /**
     * 显示窗口
     * @param {BrowserWindow} win - 窗口对象
     * @param {object} config - 配置对象
     */
    showWindow(win, config) {
        // 确保窗口显示并聚焦
        win.show();
        win.focus();

        // 将窗口移到前台（短暂置顶）
        win.setAlwaysOnTop(true);
        setTimeout(() => {
            win.setAlwaysOnTop(config.alwaysOnTop || false);
            // 再次确保窗口可见
            win.show();
            win.focus();
        }, 200);

        console.log('✅ 窗口已显示并聚焦');
    }

    /**
     * 设置窗口调试事件
     * @param {BrowserWindow} win - 窗口对象
     */
    setupWindowDebugEvents(win) {
        win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('🔍 页面加载失败:', errorCode, errorDescription);
        });

        win.webContents.on('did-start-loading', () => {
            console.log('🔄 页面开始加载');
        });

        win.webContents.on('did-stop-loading', () => {
            console.log('⏹️ 页面停止加载');
        });

        win.webContents.on('dom-ready', () => {
            console.log('📄 DOM 已准备就绪');
        });

        win.on('ready-to-show', () => {
            console.log('✅ 窗口准备显示');
        });

        win.on('show', () => {
            console.log('✅ 窗口已显示');
        });

        win.on('focus', () => {
            console.log('✅ 窗口已聚焦');
        });

        win.on('closed', () => {
            console.log('✅ 窗口已关闭');
        });
    }

    /**
     * 显示MCP服务器控制台
     */
    async showMCPConsole() {
        try {
            const serverInfo = this.appStateService.getState('mcpServerInfo');
            const consoleWindow = await this.createWindow({
                id: 'mcp-console',
                title: 'NexusGUI - MCP 服务器控制台',
                width: 900,
                height: 700,
                html: generateMCPDashboardHTML(serverInfo),
                alwaysOnTop: false,
                reuseWindow: true
            });

            console.log('✅ MCP 控制台窗口已显示');
            return consoleWindow;
        } catch (error) {
            console.error('❌ 显示MCP控制台失败:', error);
            throw error;
        }
    }

    /**
     * 显示调试信息窗口
     */
    async showDebugWindow() {
        const serverInfo = this.appStateService.getState('mcpServerInfo');
        if (!serverInfo || serverInfo.status !== 'running') {
            console.log('⚠️ MCP服务器未运行，无法显示调试信息');
            return;
        }

        const debugHtml = generateDebugWindowHTML();

        try {
            const debugWindow = await this.createWindow({
                id: 'debug-window',
                title: 'MCP 服务器 - 调试信息',
                width: 800,
                height: 600,
                html: debugHtml,
                alwaysOnTop: true
            });

            console.log('✅ 调试信息窗口已显示');
            return debugWindow;
        } catch (error) {
            console.error('❌ 显示调试窗口失败:', error);
            throw error;
        }
    }

    /**
     * 显示健康检查窗口
     */
    async showHealthCheck() {
        const serverInfo = this.appStateService.getState('mcpServerInfo');
        if (!serverInfo || serverInfo.status !== 'running') {
            console.log('⚠️ MCP服务器未运行，无法进行健康检查');
            return;
        }

        try {
            // 直接打开健康检查URL
            const { shell } = require('electron');
            await shell.openExternal(`http://localhost:${serverInfo.port}/health`);

            console.log('✅ 健康检查页面已在浏览器中打开');
        } catch (error) {
            console.error('❌ 打开健康检查页面失败:', error);
            throw error;
        }
    }

    /**
     * 显示调试控制台窗口
     */
    async showDebugConsole() {
        try {
            // 获取最近的日志
            const recentLogs = this.loggerService.getRecentLogs(200);

            // 生成调试控制台 HTML
            const { generateDebugConsoleHTML } = require('../html');
            const debugConsoleHtml = generateDebugConsoleHTML(recentLogs);

            const debugConsoleWindow = await this.createWindow({
                id: 'debug-console',
                title: 'NexusGUI - 调试控制台',
                width: 900,
                height: 700,
                html: debugConsoleHtml,
                alwaysOnTop: false,
                reuseWindow: true
            });

            console.log('✅ 调试控制台窗口已显示');
            return debugConsoleWindow;
        } catch (error) {
            console.error('❌ 显示调试控制台失败:', error);
            throw error;
        }
    }

    /**
     * 显示实时监控面板窗口
     */
    async showMonitorDashboard() {
        try {
            // 获取服务
            const appStateService = this.appStateService;
            const serviceManager = require('../managers/ServiceManager').serviceManager;
            const systemMonitorService = serviceManager.getService('systemMonitor');

            // 获取监控数据
            const monitorData = await systemMonitorService.getMonitorData();
            const serverInfo = appStateService.getState('mcpServerInfo');
            const networkStatus = appStateService.getState('networkStatus');

            // 生成实时监控面板 HTML
            const { generateMonitorDashboardHTML } = require('../html');
            const monitorDashboardHtml = generateMonitorDashboardHTML(monitorData, serverInfo, networkStatus);

            const monitorDashboardWindow = await this.createWindow({
                id: 'monitor-dashboard',
                title: 'NexusGUI - 实时监控面板',
                width: 1000,
                height: 800,
                html: monitorDashboardHtml,
                alwaysOnTop: false,
                reuseWindow: true
            });

            console.log('✅ 实时监控面板窗口已显示');
            return monitorDashboardWindow;
        } catch (error) {
            console.error('❌ 显示实时监控面板失败:', error);
            throw error;
        }
    }

    /**
     * 显示 API 测试工具窗口
     */
    async showAPITestTool() {
        try {
            // 获取服务器服务
            const serverService = this.serverService;

            // 获取工具注册器和工具列表
            let tools = [];
            let toolRegistry = null;

            // 尝试多种方式获取工具注册器
            if (serverService && serverService.sseServerInstance) {
                // 方式1：从 sseServerInstance 获取
                toolRegistry = serverService.sseServerInstance.toolRegistry;
                this.logger.debug('尝试从 sseServerInstance 获取工具注册器', { hasToolRegistry: !!toolRegistry });
            }

            // 方式2：如果上面没有获取到，尝试从全局获取
            if (!toolRegistry && global.toolRegistry) {
                toolRegistry = global.toolRegistry;
                this.logger.debug('从全局获取工具注册器', { hasToolRegistry: !!toolRegistry });
            }

            // 方式3：检查服务器状态并等待初始化
            if (!toolRegistry) {
                const serverInfo = this.appStateService.getState('mcpServerInfo');
                if (serverInfo && serverInfo.status === 'running') {
                    this.logger.warn('服务器正在运行但工具注册器未找到，尝试等待初始化...');
                    // 等待一小段时间让工具注册器初始化
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 再次尝试获取
                    if (serverService && serverService.sseServerInstance) {
                        toolRegistry = serverService.sseServerInstance.toolRegistry;
                    }
                }
            }

            if (toolRegistry) {
                try {
                    tools = toolRegistry.getToolSchemas();
                    this.logger.info(`✅ 获取到 ${tools.length} 个工具`);
                } catch (error) {
                    this.logger.error('❌ 获取工具列表失败:', error);
                    tools = [];
                }
            } else {
                this.logger.warn('⚠️ 服务器或工具注册器未初始化，将显示空的工具列表');
                // 即使没有工具，也显示界面，让用户知道当前状态
                tools = [];
            }

            // 生成 API 测试工具 HTML
            const { generateAPITestToolHTML } = require('../html');
            const apiTestToolHtml = generateAPITestToolHTML(tools);

            const apiTestToolWindow = await this.createWindow({
                id: 'api-test-tool',
                title: 'NexusGUI - API 测试工具',
                width: 900,
                height: 700,
                html: apiTestToolHtml,
                alwaysOnTop: false,
                reuseWindow: true
            });

            console.log('✅ API 测试工具窗口已显示');
            return apiTestToolWindow;
        } catch (error) {
            console.error('❌ 显示 API 测试工具失败:', error);
            throw error;
        }
    }



    /**
     * 显示会话管理窗口
     */
    async showSessionManager() {
        const serverInfo = this.appStateService.getState('mcpServerInfo');
        if (!serverInfo || serverInfo.status !== 'running') {
            console.log('⚠️ MCP服务器未运行，无法显示会话管理');
            return;
        }

        const sessionHtml = generateSessionManagerHTML();

        try {
            const sessionWindow = await this.createWindow({
                id: 'session-manager',
                title: 'MCP 服务器 - 会话管理',
                width: 700,
                height: 500,
                html: sessionHtml,
                alwaysOnTop: true
            });

            console.log('✅ 会话管理窗口已显示');
            return sessionWindow;
        } catch (error) {
            console.error('❌ 显示会话管理窗口失败:', error);
            throw error;
        }
    }

    /**
     * 显示服务器设置窗口
     */
    async showServerSettings() {
        try {
            const { settingsManager } = require('../../config/settings.js');
            const currentSettings = settingsManager.getAllSettings();
            const settingsHtml = generateServerSettingsHTML(currentSettings);

            const settingsWindow = await this.createWindow({
                id: 'server-settings',
                title: 'MCP 服务器 - 设置',
                width: 600,
                height: 400,
                html: settingsHtml,
                alwaysOnTop: true
            });

            console.log('✅ 服务器设置窗口已显示');
            return settingsWindow;
        } catch (error) {
            console.error('❌ 显示设置窗口失败:', error);
            throw error;
        }
    }

    /**
     * 刷新MCP控制台窗口
     */
    refreshMCPConsoleWindows() {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (window.getTitle().includes('MCP 服务器控制台')) {
                window.reload();
            }
        });
    }

    /**
     * 关闭所有窗口
     */
    closeAll() {
        console.log('🧹 关闭所有窗口...');
        const windows = this.appStateService.getAllWindows();
        windows.forEach((window, id) => {
            // 检查窗口是否被固定
            const isPinned = window.isPinned || false;

            if (!isPinned && !window.isDestroyed()) {
                window.close();
            } else if (isPinned) {
                console.log(`📌 窗口 ${id} 已被固定，跳过关闭`);
            }
        });
        console.log('✅ 所有非固定窗口已关闭');
    }

    /**
     * 获取窗口数量
     * @returns {number} 窗口数量
     */
    getWindowCount() {
        return this.appStateService.getAllWindows().size;
    }
}

module.exports = { WindowService };