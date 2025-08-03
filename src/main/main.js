const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initializeSSEMCPServer } = require('../mcp/sse/wrapper.js');
const { settingsManager } = require('../config/settings.js');
const i18n = require('../i18n');

const { generateSessionManagerHTML,
    generateDebugWindowHTML,
    generateMCPDashboardHTML,
    generateServerSettingsHTML
} = require('./html/index.js')

let mainWindow;
let sseServer;
let tray = null;
let mcpServerInfo = null;

// 统一 GUI 创建函数
async function createWindow(config = {}) {
    // 创建一个 Promise 用于同步等待窗口结果
    let resolveWindowResult;
    const windowResultPromise = config.waitForResult ? new Promise(resolve => {
        resolveWindowResult = resolve;
    }) : null;
    console.log('🔍 开始创建窗口...');

    // 检查是否复用现有窗口
    const reuseWindow = config.reuseWindow || false;

    if (reuseWindow) {
        // 尝试复用现有窗口
        const existingWindows = BrowserWindow.getAllWindows();
        if (existingWindows.length > 0) {
            console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，尝试复用...`);

            // 找到第一个可用的窗口
            for (const win of existingWindows) {
                if (!win.isDestroyed()) {
                    console.log(`✅ 复用现有窗口: ${win.getTitle()}`);

                    // 更新窗口配置
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

                    // 重新加载内容
                    try {
                        if (config.html) {
                            console.log('📄 使用 HTML 模式重新渲染');
                            win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(config.html)}`);
                        } else {
                            await win.loadFile(path.join(__dirname, '../renderer/index.html'));
                            console.log('✅ HTML 文件重新加载成功');
                        }

                        // 等待页面加载完成后发送配置
                        win.webContents.once('did-finish-load', () => {
                            console.log('✅ 页面重新加载完成，发送配置到渲染进程');

                            if (!config.html) {
                                console.warn('📊 ');
                            }

                            // 确保窗口显示并聚焦
                            win.show();
                            win.focus();

                            // 将窗口移到前台（短暂置顶）
                            win.setAlwaysOnTop(true);
                            setTimeout(() => {
                                win.setAlwaysOnTop(config.alwaysOnTop);
                                // 再次确保窗口可见
                                win.show();
                                win.focus();
                            }, 200);

                            console.log('✅ 复用窗口已更新并显示');
                        });

                        return win;
                    } catch (error) {
                        console.error('❌ 复用窗口时加载内容失败:', error);
                        // 如果复用失败，继续创建新窗口
                    }
                }
            }
        }
    } else {
        // 检查并关闭现有窗口
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

    // 窗口属性配置
    const windowConfig = {
        width: config.width || 800,
        height: config.height || 600,
        title: config.title || 'NexusGUI - 动态界面',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        titleBarStyle: config.showMenuBar === false ? 'hidden' : 'default',
        icon: path.join(__dirname, 'assets', 'icon.png'), // 可选图标
        // 确保窗口在屏幕中央显示
        center: true,
        // 设置最小尺寸
        minWidth: config.minWidth || 400,
        minHeight: config.minHeight || 300,
        // 设置最大尺寸
        maxWidth: config.maxWidth,
        maxHeight: config.maxHeight,
        // 窗口可见性设置
        alwaysOnTop: config.alwaysOnTop || false,
        skipTaskbar: config.skipTaskbar || false,
        // 确保窗口在任务栏显示
        showInTaskbar: config.showInTaskbar !== false,
        // 设置窗口位置（屏幕中央）
        x: config.x,
        y: config.y,
        // 窗口样式设置
        frame: config.frame !== false,
        titleBarStyle: config.titleBarStyle || 'default',
        // 窗口行为设置
        resizable: config.resizable !== false,
        movable: config.movable !== false,
        minimizable: config.minimizable !== false,
        maximizable: config.maximizable !== false,
        closable: config.closable !== false,
        // 透明度设置
        opacity: config.opacity,
        // 窗口类型设置
        type: config.windowType || 'normal',
        // 全屏设置
        fullscreen: config.fullscreen || false,
        // 缩放设置
        zoomFactor: config.zoomFactor
    };

    console.log('🔍 创建窗口:', config);
    console.log('📱 窗口配置:', windowConfig);

    const win = new BrowserWindow(windowConfig);

    console.log('🔍 创建窗口:', config);
    console.log('📱 窗口配置:', {
        width: config.width || 800,
        height: config.height || 600,
        title: config.title || 'NexusGUI - 动态界面'
    });


    try {

        if (config.html) {
            console.log('📄 使用 HTML 模式渲染');
            // 直接加载 HTML 内容到渲染窗口
            win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(config.html)}`);
            console.log('✅ HTML 内容已直接加载到渲染窗口');

        } else {
            await win.loadFile(path.join(__dirname, '../renderer/index.html'));
            console.log('✅ HTML 文件加载成功');
        }

    } catch (error) {
        console.error('❌ HTML 文件加载失败:', error);
        throw error;
    }

    // 添加超时机制，确保窗口一定会显示
    let isWindowShown = false;

    // 等待页面加载完成后发送配置
    win.webContents.once('did-finish-load', () => {
        console.log('✅ 页面加载完成，发送配置到渲染进程');

        if (!isWindowShown) {
            isWindowShown = true;

            console.log(`DEBUG: In createWindow, config.html type: ${typeof config.html}`);
            console.log(`DEBUG: In createWindow, config.html value:`, config.html ? config.html.substring(0, 50) + '...' : 'null/undefined/empty');
            // 检查是否使用 HTML 模式
            // HTML 模式：内容已通过 loadURL 直接加载
            if (!config.html) {
                console.warn('⚠️ 未提供 HTML 内容');
            }

            // 确保窗口显示并聚焦
            win.show();
            win.focus();

            // 将窗口移到前台（短暂置顶）
            win.setAlwaysOnTop(true);
            setTimeout(() => {
                win.setAlwaysOnTop(config.alwaysOnTop);
                // 再次确保窗口可见
                win.show();
                win.focus();
            }, 200);

            console.log('✅ 窗口已显示并聚焦');
        }
    });

    // 添加超时机制，如果页面加载超时，强制显示窗口
    setTimeout(() => {
        if (!isWindowShown) {
            console.log('⚠️ 页面加载超时，强制显示窗口');
            isWindowShown = true;

            // HTML 模式不需要发送配置到渲染进程

            // 强制显示窗口
            win.show();
            win.focus();
            win.setAlwaysOnTop(true);
            setTimeout(() => {
                win.setAlwaysOnTop(config.alwaysOnTop);
            }, 500);

            console.log('✅ 窗口已强制显示');
        }
    }, 3000); // 3秒超时

    // 调试页面加载失败
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('🔍 页面加载失败:', errorCode, errorDescription);
    });

    // 添加更多页面加载调试信息
    win.webContents.on('did-start-loading', () => {
        console.log('🔄 页面开始加载');
    });

    win.webContents.on('did-stop-loading', () => {
        console.log('⏹️ 页面停止加载');
    });

    win.webContents.on('dom-ready', () => {
        console.log('📄 DOM 已准备就绪');
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        win.webContents.openDevTools();
        console.log('🔧 开发者工具已打开');
    }

    // 监听窗口事件
    win.on('ready-to-show', () => {
        console.log('✅ 窗口准备显示');
    });

    win.on('show', () => {
        console.log('✅ 窗口已显示');
    });

    win.on('focus', () => {
        console.log('✅ 窗口已聚焦');
    });

    // 监听窗口关闭事件
    win.on('closed', () => {
        console.log('✅ 窗口已关闭');

        // 如果窗口有结果解析器但尚未解析，则在窗口关闭时解析
        if (win.windowResultResolver) {
            win.windowResultResolver({
                action: 'close',
                data: null
            });
        }
    });

    // 如果需要等待结果，存储解析器到窗口对象
    if (config.waitForResult && resolveWindowResult) {
        win.windowResultResolver = resolveWindowResult;
    }

    // 如果需要等待结果，返回 Promise，否则返回窗口对象
    if (config.waitForResult) {
        console.log('⏳ 等待窗口结果...');
        const result = await windowResultPromise;
        console.log('✅ 收到窗口结果:', result);
        return result;
    } else {
        return win;
    }
}

// 暴露给全局，供 MCP 服务器调用
global.createWindow = async (config = {}) => {
    console.log('🌐 通过 MCP 调用创建窗口');

    return await createWindow(config);
};

// 全局函数：向当前活动窗口注入 JavaScript 代码
global.injectJsToWindow = async (config) => {
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

// 创建系统托盘图标
function createTrayIcon() {
    // 创建托盘图标 (使用系统默认图标或自定义图标)
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    let trayIcon;

    try {
        // 尝试使用自定义图标
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            throw new Error('自定义图标为空');
        }
    } catch (error) {
        // 如果自定义图标不存在，使用系统默认图标
        console.log('使用系统默认托盘图标');
        trayIcon = nativeImage.createEmpty();
        // 在macOS上创建一个简单的模板图标
        if (process.platform === 'darwin') {
            trayIcon = nativeImage.createFromNamedImage('NSStatusAvailable', [16, 16]);
        }
    }

    tray = new Tray(trayIcon);

    // 设置托盘提示文本
    tray.setToolTip('NexusGUI - MCP 服务器控制台');

    // 创建托盘菜单
    updateTrayMenu();

    // 双击托盘图标显示主控制台
    tray.on('double-click', () => {
        showMCPConsole();
    });

    console.log('✅ 系统托盘已创建');
}

// 更新托盘菜单
function updateTrayMenu() {
    if (!tray) return;

    const serverStatus = mcpServerInfo?.status === 'running' ? '🟢 运行中' : '🔴 已停止';
    const serverPort = mcpServerInfo?.port || '未知';
    const activeSessions = getActiveSessionsCount();

    const contextMenu = Menu.buildFromTemplate([
        {
            label: `NexusGUI MCP 服务器`,
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
            click: () => showMCPConsole()
        },
        {
            label: '🔧 调试信息窗口',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showDebugWindow()
        },
        {
            label: '🏥 健康检查',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showHealthCheck()
        },
        {
            label: '📋 会话管理',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showSessionManager()
        },
        { type: 'separator' },
        {
            label: '🔄 刷新状态',
            type: 'normal',
            click: () => refreshServerStatus()
        },
        {
            label: '⚙️ 服务器设置',
            type: 'normal',
            click: () => showServerSettings()
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

    tray.setContextMenu(contextMenu);
}

// 获取活动会话数量
function getActiveSessionsCount() {
    // 这里需要从MCP服务器获取实际的会话数量
    // 暂时返回模拟数据
    return 0;
}

// 显示MCP服务器控制台
async function showMCPConsole() {
    try {
        const consoleWindow = await createWindow({
            title: 'NexusGUI - MCP 服务器控制台',
            width: 900,
            height: 700,
            html: generateMCPDashboardHTML(mcpServerInfo),
            alwaysOnTop: false,
            reuseWindow: true
        });

        console.log('✅ MCP 控制台窗口已显示');
    } catch (error) {
        console.error('❌ 显示MCP控制台失败:', error);
    }
}

// 显示调试信息窗口
async function showDebugWindow() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法显示调试信息');
        return;
    }

    const debugHtml = generateDebugWindowHTML();

    try {
        await createWindow({
            title: 'MCP 服务器 - 调试信息',
            width: 800,
            height: 600,
            html: debugHtml,
            alwaysOnTop: true
        });

        console.log('✅ 调试信息窗口已显示');
    } catch (error) {
        console.error('❌ 显示调试窗口失败:', error);
    }
}

// 显示健康检查窗口
async function showHealthCheck() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法进行健康检查');
        return;
    }

    try {
        // 直接打开健康检查URL
        const { shell } = require('electron');
        await shell.openExternal(`http://localhost:${mcpServerInfo.port}/health`);

        console.log('✅ 健康检查页面已在浏览器中打开');
    } catch (error) {
        console.error('❌ 打开健康检查页面失败:', error);
    }
}

// 显示会话管理窗口
async function showSessionManager() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法显示会话管理');
        return;
    }

    const sessionHtml = generateSessionManagerHTML();

    try {
        await createWindow({
            title: 'MCP 服务器 - 会话管理',
            width: 700,
            height: 500,
            html: sessionHtml,
            alwaysOnTop: true
        });

        console.log('✅ 会话管理窗口已显示');
    } catch (error) {
        console.error('❌ 显示会话管理窗口失败:', error);
    }
}

// 刷新服务器状态
function refreshServerStatus() {
    console.log('🔄 刷新服务器状态...');

    // 更新托盘菜单
    updateTrayMenu();

    // 如果主控制台窗口打开，刷新它
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
        if (window.getTitle().includes('MCP 服务器控制台')) {
            window.reload();
        }
    });

    console.log('✅ 服务器状态已刷新');
}

// 显示服务器设置窗口
async function showServerSettings() {
    const currentSettings = settingsManager.getAllSettings();

    const settingsHtml = generateServerSettingsHTML(currentSettings);

    try {
        await createWindow({
            title: 'MCP 服务器 - 设置',
            width: 600,
            height: 400,
            html: settingsHtml,
            alwaysOnTop: true
        });

        console.log('✅ 服务器设置窗口已显示');
    } catch (error) {
        console.error('❌ 显示设置窗口失败:', error);
    }
}

app.whenReady().then(async () => {
    // 从设置中获取端口
    const serverPort = settingsManager.getSetting('server.port') || 3000;

    mcpServerInfo = {
        status: 'failed',
        port: serverPort,
        endpoints: [],
        error: null,
        startTime: new Date().toISOString()
    };

    // 初始化 SSE MCP 服务器
    try {
        const { sseServer: createSSEServer } = await initializeSSEMCPServer();
        sseServer = createSSEServer(serverPort);

        mcpServerInfo = {
            status: 'running',
            port: serverPort,
            endpoints: [
                { name: 'SSE 连接', path: '/mcp', description: '建立 Server-Sent Events 连接' },
                { name: '消息处理', path: '/messages', description: '处理 JSON-RPC 消息' },
                { name: '健康检查', path: '/health', description: '服务器状态检查' },
                { name: '调试信息', path: '/debug/sessions', description: '查看活动会话' }
            ],
            error: null,
            startTime: new Date().toISOString(),
            serverName: 'nexusgui-sse-server',
            version: '0.1.0'
        };

        console.log('✅ SSE MCP 服务器已启动');
    } catch (error) {
        console.error('❌ SSE MCP 服务器启动失败:', error);
        mcpServerInfo.error = error.message;
    }

    // 创建系统托盘
    createTrayIcon();

    // 创建主窗口并显示MCP服务器信息（可选，也可以只通过托盘访问）
    if (process.argv.includes('--show-main-window')) {
        mainWindow = await createWindow({
            title: 'NexusGUI - MCP 服务器控制台',
            html: generateMCPDashboardHTML(mcpServerInfo)
        });
    }

    app.on('activate', async () => {
        // 在macOS上，点击dock图标时显示主控制台
        if (process.platform === 'darwin') {
            showMCPConsole();
        }
    });
});

app.on('window-all-closed', () => {
    // 有托盘图标时，关闭所有窗口不退出应用
    if (tray) {
        console.log('✅ 所有窗口已关闭，应用继续在托盘中运行');
        return;
    }

    if (process.platform !== 'darwin') {
        // 关闭 SSE MCP 服务器
        if (sseServer) {
            sseServer.close();
        }
        app.quit();
    }
});

app.on('before-quit', () => {
    // 应用退出前清理托盘
    if (tray) {
        tray.destroy();
        tray = null;
    }

    // 关闭 SSE MCP 服务器
    if (sseServer) {
        sseServer.close();
    }

    console.log('✅ 应用正在退出，资源已清理');
});

// IPC 处理程序
ipcMain.handle('mcp-result', async (event, result) => {
    console.log('📤 收到来自渲染进程的结果:', result);
    // 这里可以将结果发送回 MCP 客户端
    return { success: true };
});

// 处理窗口结果（用于同步等待）
ipcMain.handle('window-result', async (event, result) => {
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

// 添加窗口状态检查
ipcMain.handle('check-window-status', async () => {
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

// 设置管理 IPC 处理程序
ipcMain.handle('get-settings', async () => {
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

ipcMain.handle('save-settings', async (event, newSettings) => {
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
            // 如果端口发生变化，需要重启服务器
            const oldPort = mcpServerInfo.port;
            const newPort = settingsManager.getSetting('server.port');

            if (oldPort !== newPort) {
                console.log(`🔄 端口从 ${oldPort} 更改为 ${newPort}，需要重启服务器`);

                // 关闭旧服务器
                if (sseServer) {
                    sseServer.close();
                }

                // 启动新服务器
                try {
                    const { sseServer: createSSEServer } = await initializeSSEMCPServer();
                    sseServer = createSSEServer(newPort);

                    mcpServerInfo.port = newPort;
                    mcpServerInfo.status = 'running';
                    mcpServerInfo.error = null;

                    console.log(`✅ MCP 服务器已在新端口 ${newPort} 上重启`);
                } catch (error) {
                    console.error('❌ 重启服务器失败:', error);
                    mcpServerInfo.status = 'failed';
                    mcpServerInfo.error = error.message;
                }

                // 更新托盘菜单
                updateTrayMenu();
            }

            return {
                success: true,
                message: '设置已保存',
                backupPath,
                serverRestarted: oldPort !== newPort
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

ipcMain.handle('reset-settings', async () => {
    try {
        const backupPath = settingsManager.backupSettings();
        const success = settingsManager.resetToDefaults();

        if (success) {
            // 重启服务器以应用默认端口
            const defaultPort = settingsManager.getSetting('server.port');

            if (sseServer) {
                sseServer.close();
            }

            try {
                const { sseServer: createSSEServer } = await initializeSSEMCPServer();
                sseServer = createSSEServer(defaultPort);

                mcpServerInfo.port = defaultPort;
                mcpServerInfo.status = 'running';
                mcpServerInfo.error = null;

                updateTrayMenu();

                console.log(`✅ 设置已重置，服务器在端口 ${defaultPort} 上重启`);
            } catch (error) {
                console.error('❌ 重启服务器失败:', error);
                mcpServerInfo.status = 'failed';
                mcpServerInfo.error = error.message;
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

ipcMain.handle('get-form-data', async (event, formSelector) => {
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
(async () => {
    if (process.argv.includes('-gui')) {
        const guiIndex = process.argv.indexOf('-gui');
        const guiName = process.argv[guiIndex + 1];

        if (guiName) {
            // 尝试加载本地 GUI 定义文件
            const guiPath = path.join(__dirname, 'guis', `${guiName}.json`);
            try {
                const { readFileSync } = await
                    import('fs');
                const guiConfig = JSON.parse(readFileSync(guiPath, 'utf8'));
                app.whenReady().then(() => {
                    createWindow(guiConfig);
                });
            } catch (error) {
                console.error(`❌ 无法加载 GUI 定义: ${guiName}`, error);
            }
        }
    }
})();




console.log('🚀 NexusGUI 主进程已启动');