const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { settingsManager } = require('../config/settings.js');
const i18n = require('../i18n');
const { serviceManager } = require('./managers/ServiceManager');
const { generateStartupWizardHTML } = require('./html');

// 引入 MCP 服务器管理器
const mcpServerManager = require('../mcp/mcp_exe/server');

// 提前注册 i18n 相关 IPC 处理器，确保在任何窗口创建前就可用
ipcMain.handle('get-current-locale', async() => {
    try {
        // 确保 i18n 已初始化
        if (!i18n.getCurrentLocale() || i18n.getCurrentLocale() === 'en-US') {
            await i18n.initialize();
        }
        return i18n.getCurrentLocale();
    } catch (error) {
        console.error('获取当前语言失败:', error);
        return 'en-US'; // 返回默认语言
    }
});

ipcMain.handle('set-locale', async(event, locale) => {
    try {
        const success = await i18n.setLocale(locale);
        if (success) {
            // 通知所有窗口语言已更改
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('language-changed', locale);
            });
        }
        return success;
    } catch (error) {
        console.error('设置语言失败:', error);
        return false;
    }
});

ipcMain.handle('get-translation', async(event, key, fallback) => {
    try {
        return i18n.t(key, fallback);
    } catch (error) {
        console.error('获取翻译失败:', error);
        return fallback || key;
    }
});

ipcMain.handle('get-supported-locales', async() => {
    try {
        return i18n.getSupportedLocales();
    } catch (error) {
        console.error('获取支持的语言列表失败:', error);
        return ['en-US', 'zh-CN'];
    }
});

// 暴露给全局，供 MCP 服务器调用（保持向后兼容）
global.createWindow = async(config = {}) => {
    const logger = serviceManager.getService('logger').createModuleLogger('GLOBAL');
    const errorHandler = serviceManager.getService('errorHandler');

    logger.info('通过 MCP 调用创建窗口', { config });

    try {
        // 确保服务管理器已初始化
        if (!serviceManager.isServiceManagerInitialized()) {
            await serviceManager.initialize();
        }

        const windowService = serviceManager.getService('window');
        return await windowService.createWindow(config);
    } catch (error) {
        await errorHandler.handleError(error, {
            module: 'GLOBAL',
            operation: 'createWindow',
            config
        });
        throw error;
    }
};

// 暴露 appStateService 给全局作用域
global.appStateService = null;
Object.defineProperty(global, 'appStateService', {
    get: function() {
        if (serviceManager && serviceManager.isServiceManagerInitialized()) {
            try {
                return serviceManager.getService('appState');
            } catch (error) {
                return null;
            }
        }
        return null;
    }
});

// 暴露 loggerService 给全局作用域
global.loggerService = null;
Object.defineProperty(global, 'loggerService', {
    get: function() {
        if (serviceManager && serviceManager.isServiceManagerInitialized()) {
            try {
                return serviceManager.getService('logger');
            } catch (error) {
                return null;
            }
        }
        return null;
    }
});

// 暴露 serverService 给全局作用域
global.serverService = null;
Object.defineProperty(global, 'serverService', {
    get: function() {
        if (serviceManager && serviceManager.isServiceManagerInitialized()) {
            try {
                return serviceManager.getService('server');
            } catch (error) {
                return null;
            }
        }
        return null;
    }
});

// 获取 RenderGUITool 实例的辅助函数
async function getRenderGUITool() {
    try {
        // 确保服务管理器已初始化
        if (!serviceManager.isServiceManagerInitialized()) {
            await serviceManager.initialize();
        }

        const serverService = serviceManager.getService('server');
        if (serverService) {
            const renderGUITool = serverService.getRenderGUITool();
            return renderGUITool;
        }
    } catch (error) {
        const logger = serviceManager.getService('logger').createModuleLogger('GLOBAL');
        const errorHandler = serviceManager.getService('errorHandler');
        await errorHandler.handleError(error, {
            module: 'GLOBAL',
            operation: 'getRenderGUITool'
        });
    }
    return null;
}

// 显示缓存的 GUI（仅当有缓存时）
async function showAppWindow() {
    try {
        console.log('🔍 检查是否有缓存的 render-gui HTML...');

        // 直接从全局获取缓存
        const cachedHtml = global.renderGuiCache;

        if (cachedHtml) {
            console.log('✅ 找到缓存的 HTML，显示缓存的 GUI');
            console.log('📄 缓存详情:', {
                title: cachedHtml.config ?.title,
                htmlLength: cachedHtml.html ?.length,
                timestamp: cachedHtml.timestamp
            });

            // 直接使用全局 createWindow 创建窗口
            const windowConfig = {
                type: 'dynamic',
                title: cachedHtml.config.title,
                width: cachedHtml.config.width,
                height: cachedHtml.config.height,
                html: cachedHtml.html,
                callbacks: cachedHtml.config.callbacks,
                reuseWindow: true,
                waitForResult: false
            };

            await global.createWindow(windowConfig);
            console.log('🎉 缓存的 GUI 已成功显示');
            return;
        }

        console.log('ℹ️ 没有找到缓存的 HTML，不显示任何窗口');

    } catch (error) {
        console.error('❌ 显示应用窗口失败:', error);
    }
}

// 暴露 showAppWindow 函数给其他模块使用
global.showAppWindow = showAppWindow;

// 全局函数：向当前活动窗口注入 JavaScript 代码
global.injectJsToWindow = async(config) => {
    const { code, waitForResult, params } = config;

    console.log('🔧 主进程：准备注入 JavaScript 代码');

    // 获取当前焦点窗口
    let targetWindow = BrowserWindow.getFocusedWindow();

    // 如果没有焦点窗口，尝试获取所有窗口中的第一个
    if (!targetWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
            targetWindow = allWindows[0];
            console.log('⚠️ 没有焦点窗口，使用第一个可用窗口');
        }
    }

    if (!targetWindow) {
        throw new Error('找不到可用的窗口');
    }

    console.log(`🎯 目标窗口 ID: ${targetWindow.id}, 标题: "${targetWindow.getTitle()}"`);

    // 准备要执行的代码
    const wrappedCode = `
        (function() {
            try {
                // 定义注入参数，供注入的代码使用
                const injectedParams = ${JSON.stringify(params)};
                
                // 执行注入的代码
                const result = (function() {
                    ${code}
                })();
                
                return result;
            } catch (error) {
                console.error('注入代码执行错误:', error);
                return { error: error.message, stack: error.stack };
            }
        })();
    `;

    // 执行代码
    if (waitForResult) {
        // 同步等待结果
        try {
            console.log('⏳ 同步执行代码并等待结果...');
            const result = await targetWindow.webContents.executeJavaScript(wrappedCode);
            console.log('✅ 代码执行完成，结果:', result);
            return result;
        } catch (error) {
            console.error('❌ 代码执行失败:', error);
            throw new Error(`代码执行失败: ${error.message}`);
        }
    } else {
        // 异步执行，不等待结果
        console.log('🚀 异步执行代码...');
        targetWindow.webContents.executeJavaScript(wrappedCode)
            .then(result => {
                console.log('✅ 异步代码执行完成，结果:', result);
            })
            .catch(error => {
                console.error('❌ 异步代码执行错误:', error);
            });

        return { status: 'executing', message: '代码已开始异步执行' };
    }
};

// 应用启动
app.whenReady().then(async() => {
    let logger, errorHandler;

    try {
        // 初始化 i18n
        await i18n.initialize();
        console.log('✅ i18n 初始化完成');

        // 启动所有服务
        await serviceManager.startAll();

        // 获取日志和错误处理服务
        logger = serviceManager.getService('logger').createModuleLogger('MAIN');
        errorHandler = serviceManager.getService('errorHandler');

        logger.info('应用启动中...');

        // 检查是否是首次运行
        const isFirstRun = settingsManager.getSetting('startup.firstRun');
        if (isFirstRun) {
            // 显示首次运行向导
            await showStartupWizard();
        } else {
            // 根据启动模式设置决定是否显示主窗口
            const startupMode = settingsManager.getSetting('startup.mode');
            if (startupMode === 'window' || process.argv.includes('--show-main-window')) {
                const windowService = serviceManager.getService('window');
                await windowService.showMCPConsole();
            }
        }

        logger.info('应用启动完成');

    } catch (error) {
        if (errorHandler) {
            await errorHandler.handleError(error, {
                module: 'MAIN',
                operation: 'appReady'
            });
        } else {
            console.error('❌ 应用启动失败:', error);
        }
        app.quit();
    }

    // macOS 激活事件
    app.on('activate', async() => {
        if (process.platform === 'darwin') {
            logger.info('macOS 应用激活事件触发');
            await showAppWindow();
        }
    });
});

// 显示首次运行向导窗口
async function showStartupWizard() {
    console.log('🔍 显示首次运行向导...');

    try {
        // 创建向导窗口
        const wizardWindow = new BrowserWindow({
            width: 550,
            height: 600,
            title: 'NexusGUI - 首次运行向导',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            resizable: false,
            maximizable: false,
            icon: path.join(__dirname, '../assets', 'icon.png'),
            center: true
        });

        // 加载向导HTML
        const wizardHTML = generateStartupWizardHTML();
        wizardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(wizardHTML)}`);

        // 设置开发者工具
        if (process.argv.includes('--dev')) {
            wizardWindow.webContents.openDevTools();
            console.log('🔧 开发者工具已打开');
        }

        console.log('✅ 首次运行向导已显示');
    } catch (error) {
        console.error('❌ 显示首次运行向导失败:', error);
    }
}

// 窗口关闭事件
app.on('window-all-closed', () => {
    try {
        const trayService = serviceManager.getService('tray');
        const logger = serviceManager.getService('logger').createModuleLogger('MAIN');

        if (trayService.exists()) {
            logger.info('所有窗口已关闭，应用继续在托盘中运行');
            return;
        }
    } catch (error) {
        const errorHandler = serviceManager.getService('errorHandler');
        if (errorHandler) {
            errorHandler.handleError(error, {
                module: 'MAIN',
                operation: 'windowAllClosed'
            });
        } else {
            console.error('❌ 检查托盘状态失败:', error);
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('before-quit', async() => {
    try {
        const logger = serviceManager.getService('logger').createModuleLogger('MAIN');
        const errorHandler = serviceManager.getService('errorHandler');

        logger.info('应用正在退出，清理资源...');
        await serviceManager.stopAll();
        logger.info('应用正在退出，资源已清理');
    } catch (error) {
        const errorHandler = serviceManager.getService('errorHandler');
        if (errorHandler) {
            await errorHandler.handleError(error, {
                module: 'MAIN',
                operation: 'beforeQuit'
            });
        } else {
            console.error('❌ 清理资源时出错:', error);
        }
    }
});

// MCP 服务器相关 IPC 处理
ipcMain.handle('start-mcp-server', async() => {
    try {
        await mcpServerManager.start();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-mcp-server', async() => {
    try {
        await mcpServerManager.stop();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('restart-mcp-server', async() => {
    try {
        await mcpServerManager.restart();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-mcp-server-status', async() => {
    return mcpServerManager.getStatus();
});

ipcMain.handle('save-mcp-config', async(event, config) => {
    try {
        const configManager = require('../mcp/mcp_exe/integration/ConfigManager');
        const manager = new configManager();
        manager.saveUserConfig(config);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// MCP 配置文件相关 IPC 处理
ipcMain.handle('get-mcp-default-config', async() => {
    try {
        const configManager = require('../mcp/mcp_exe/integration/ConfigManager');
        const manager = new configManager();
        const config = manager.getUserConfig();
        return { success: true, config };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-mcp-user-config', async() => {
    try {
        const configManager = require('../mcp/mcp_exe/integration/ConfigManager');
        const manager = new configManager();
        const config = manager.getUserConfig();
        return { success: true, config };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-mcp-example-config', async() => {
    try {
        const fs = require('fs');
        const path = require('path');
        const exampleConfigPath = path.join(__dirname, '../mcp/mcp_exe/config/example-mcp.json');
        const config = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
        return { success: true, config };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC 处理程序
ipcMain.handle('mcp-result', async(event, result) => {
    console.log('📤 收到来自渲染进程的结果:', result);
    // 这里可以将结果发送回 MCP 客户端
    return { success: true };
});


// 添加在文件管理器中显示文件的处理程序
ipcMain.handle('show-item-in-folder', async(event, filePath) => {
    try {
        const { shell } = require('electron');
        shell.showItemInFolder(filePath);
        console.log(`✅ 在文件管理器中显示文件: ${filePath}`);
        return { success: true };
    } catch (error) {
        console.error('❌ 在文件管理器中显示文件失败:', error);
        return { success: false, error: error.message };
    }
});

// 添加在默认浏览器中打开 URL 的处理程序
ipcMain.handle('open-external', async(event, url) => {
    try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        console.log(`✅ 在默认浏览器中打开 URL: ${url}`);
        return { success: true };
    } catch (error) {
        console.error('❌ 在默认浏览器中打开 URL 失败:', error);
        return { success: false, error: error.message };
    }
});

// 处理窗口结果（用于同步等待）
ipcMain.handle('window-result', async(event, result) => {
    console.log('📤 收到窗口结果:', result);

    // 获取发送结果的窗口
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win.windowResultResolver) {
        // 解析窗口结果 Promise
        win.windowResultResolver({
            action: 'submit',
            data: result
        });

        // 关闭窗口
        win.close();
    }

    return { success: true };
});

// 处理开发者工具打开请求
ipcMain.on('open-dev-tools', (event) => {
    const webContents = event.sender;
    webContents.openDevTools();
    console.log('🔧 开发者工具已打开');
});

// 处理窗口固定/取消固定请求
ipcMain.on('toggle-window-pin', async(event, isPinned) => {
    try {
        console.log('📥 收到窗口固定状态切换请求:', isPinned);

        // 获取发送事件的窗口
        const window = BrowserWindow.fromWebContents(event.sender);

        if (window) {
            // 更新窗口的固定状态
            window.isPinned = isPinned;
            console.log(`📌 窗口固定状态已更新: ${isPinned}`);

            // 发送响应
            event.reply('window-pin-toggled', { success: true, isPinned });
        } else {
            console.error('❌ 无法找到对应的窗口');
            event.reply('window-pin-toggled', { success: false, error: '无法找到对应的窗口' });
        }
    } catch (error) {
        console.error('❌ 处理窗口固定状态切换失败:', error);
        event.reply('window-pin-toggled', { success: false, error: error.message });
    }
});

// 处理首次运行向导完成事件
ipcMain.on('startup-wizard-complete', async(event, mode) => {
    console.log('📥 收到来自向导的选择:', mode);

    try {
        // 更新设置
        settingsManager.setSetting('startup.mode', mode);
        settingsManager.setSetting('startup.firstRun', false);

        // 获取发送事件的窗口
        const wizardWindow = BrowserWindow.fromWebContents(event.sender);

        // 关闭向导窗口
        if (wizardWindow) {
            wizardWindow.close();
        }

        // 根据选择的模式启动相应功能
        if (mode === 'window') {
            const windowService = serviceManager.getService('window');
            await windowService.showMCPConsole();
        }

        console.log('✅ 首次运行向导已完成，设置已保存');
    } catch (error) {
        console.error('❌ 处理向导完成事件失败:', error);
    }
});

// 添加窗口状态检查
ipcMain.handle('check-window-status', async() => {
    const windows = BrowserWindow.getAllWindows();
    return {
        windowCount: windows.length,
        windows: windows.map(win => ({
            id: win.id,
            title: win.getTitle(),
            isVisible: win.isVisible(),
            isDestroyed: win.isDestroyed(),
            bounds: win.getBounds()
        }))
    };
});

// MCP 工具相关 IPC 处理程序
ipcMain.handle('get-available-tools', async() => {
    try {
        // 确保服务管理器已初始化
        if (!serviceManager.isServiceManagerInitialized()) {
            await serviceManager.initialize();
        }

        const serverService = serviceManager.getService('server');
        if (!serverService || !serverService.sseServerInstance || !serverService.sseServerInstance.toolRegistry) {
            return {
                success: false,
                error: '工具注册器未初始化',
                tools: []
            };
        }

        const toolRegistry = serverService.sseServerInstance.toolRegistry;
        const tools = toolRegistry.getToolSchemas();

        return {
            success: true,
            tools: tools,
            count: tools.length
        };
    } catch (error) {
        console.error('❌ 获取可用工具失败:', error);
        return {
            success: false,
            error: error.message,
            tools: []
        };
    }
});

ipcMain.handle('execute-mcp-tool', async(event, toolName, params) => {
    try {
        console.log(`🔧 执行工具: ${toolName}`, params);

        // 确保服务管理器已初始化
        if (!serviceManager.isServiceManagerInitialized()) {
            await serviceManager.initialize();
        }

        const serverService = serviceManager.getService('server');
        if (!serverService || !serverService.sseServerInstance || !serverService.sseServerInstance.toolRegistry) {
            throw new Error('工具注册器未初始化');
        }

        const toolRegistry = serverService.sseServerInstance.toolRegistry;
        const startTime = Date.now();

        // 执行工具
        const result = await toolRegistry.executeTool(toolName, params);
        const duration = Date.now() - startTime;

        console.log(`✅ 工具 ${toolName} 执行成功，耗时: ${duration}ms`);

        return {
            success: true,
            tool: toolName,
            params: params,
            result: result,
            duration: duration,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`❌ 工具 ${toolName} 执行失败:`, error);

        return {
            success: false,
            tool: toolName,
            params: params,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
    }
});

// 设置管理 IPC 处理程序
ipcMain.handle('get-settings', async() => {
    try {
        return {
            success: true,
            settings: settingsManager.getAllSettings()
        };
    } catch (error) {
        console.error('❌ 获取设置失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('save-settings', async(event, newSettings) => {
    try {
        console.log('📥 收到设置保存请求:', JSON.stringify(newSettings, null, 2));

        // 验证设置
        console.log('🔍 开始验证设置...');
        const validation = settingsManager.validateSettings(newSettings);
        console.log('🔍 验证完成，结果:', validation);

        if (!validation.isValid) {
            console.log('❌ 设置验证失败:', validation.errors);
            return {
                success: false,
                error: '设置验证失败',
                details: validation.errors
            };
        }

        console.log('✅ 设置验证通过');

        // 备份当前设置
        const backupPath = settingsManager.backupSettings();

        // 更新设置
        const success = settingsManager.updateSettings(newSettings);

        if (success) {
            let serverRestarted = false;
            let mcpServerRestarted = false;

            // 检查SSE服务器端口变化
            const serverService = serviceManager.getService('server');
            const appStateService = serviceManager.getService('appState');

            const oldPort = appStateService.getState('mcpServerInfo').port;
            const newPort = settingsManager.getSetting('server.port');

            if (oldPort !== newPort) {
                console.log(`🔄 SSE服务器端口从 ${oldPort} 更改为 ${newPort}，需要重启服务器`);

                try {
                    await serverService.restart(newPort);
                    console.log(`✅ SSE服务器已在新端口 ${newPort} 上重启`);
                    serverRestarted = true;
                } catch (error) {
                    console.error('❌ 重启SSE服务器失败:', error);
                }
            }

            // 检查MCP服务器端口变化
            const mcpServerManager = require('../mcp/mcp_exe/server');
            const oldMcpPort = mcpServerManager.port;
            const newMcpPort = settingsManager.getSetting('mcp.port');

            if (oldMcpPort !== newMcpPort) {
                console.log(`🔄 MCP服务器端口从 ${oldMcpPort} 更改为 ${newMcpPort}，需要重启MCP服务器`);

                try {
                    // 更新MCP服务器端口
                    mcpServerManager.updatePort(newMcpPort);

                    // 如果MCP服务器正在运行，重启它
                    if (mcpServerManager.isRunning) {
                        await mcpServerManager.restart();
                        console.log(`✅ MCP服务器已在新端口 ${newMcpPort} 上重启`);
                        mcpServerRestarted = true;
                    }
                } catch (error) {
                    console.error('❌ 重启MCP服务器失败:', error);
                }
            }

            // 检查MCP配置变化
            const oldMcpConfig = settingsManager.getSetting('mcp.config');
            const newMcpConfig = newSettings['mcp.config'];

            if (newMcpConfig && oldMcpConfig !== newMcpConfig) {
                console.log('🔄 MCP配置已更新，需要重启MCP服务器');

                try {
                    // 如果MCP服务器正在运行，重启它以应用新配置
                    if (mcpServerManager.isRunning) {
                        await mcpServerManager.restart();
                        console.log('✅ MCP服务器已重启以应用新配置');
                        mcpServerRestarted = true;
                    }
                } catch (error) {
                    console.error('❌ 重启MCP服务器以应用新配置失败:', error);
                }
            }

            return {
                success: true,
                message: '设置已保存',
                backupPath,
                serverRestarted: serverRestarted || mcpServerRestarted,
                serverRestarted: serverRestarted,
                mcpServerRestarted: mcpServerRestarted
            };
        } else {
            return {
                success: false,
                error: '保存设置失败'
            };
        }
    } catch (error) {
        console.error('❌ 保存设置时出错:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('reset-settings', async() => {
    try {
        const backupPath = settingsManager.backupSettings();
        const success = settingsManager.resetToDefaults();

        if (success) {
            // 重启服务器以应用默认端口
            const defaultPort = settingsManager.getSetting('server.port');
            const serverService = serviceManager.getService('server');

            try {
                await serverService.restart(defaultPort);
                console.log(`✅ 设置已重置，服务器在端口 ${defaultPort} 上重启`);
            } catch (error) {
                console.error('❌ 重启服务器失败:', error);
            }

            return {
                success: true,
                message: '设置已重置为默认值',
                backupPath
            };
        } else {
            return {
                success: false,
                error: '重置设置失败'
            };
        }
    } catch (error) {
        console.error('❌ 重置设置时出错:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('get-form-data', async(event, formSelector) => {
    // 获取表单数据的辅助方法
    return new Promise((resolve) => {
        event.sender.executeJavaScript(`
      (() => {
        const form = document.querySelector('${formSelector}') || document.body;
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
          data[key] = value;
        }
        return data;
      })()
    `).then(resolve);
    });
});

// 命令行参数处理（支持 -gui 参数）
(async() => {
    if (process.argv.includes('-gui')) {
        const guiIndex = process.argv.indexOf('-gui');
        const guiName = process.argv[guiIndex + 1];

        if (guiName) {
            // 尝试加载本地 GUI 定义文件
            const guiPath = path.join(__dirname, 'guis', `${guiName}.json`);
            try {
                const { readFileSync } = await
                import ('fs');
                const guiConfig = JSON.parse(readFileSync(guiPath, 'utf8'));
                app.whenReady().then(async() => {
                    try {
                        if (!serviceManager.isServiceManagerInitialized()) {
                            await serviceManager.initialize();
                        }
                        const windowService = serviceManager.getService('window');
                        await windowService.createWindow(guiConfig);
                    } catch (error) {
                        console.error('❌ 创建GUI窗口失败:', error);
                    }
                });
            } catch (error) {
                console.error(`❌ 无法加载 GUI 定义: ${guiName}`, error);
            }
        }
    }
})();

// 初始化日志将在 ServiceManager 中处理
// console.log('🚀 NexusGUI 主进程已启动');