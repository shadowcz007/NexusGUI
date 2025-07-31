const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeSSEMCPServer } = require('../mcp/sse/wrapper.js');

// __dirname 在 CommonJS 中已经可用

let mainWindow;
let sseServer;

// 统一 GUI 创建函数
async function createWindow(config = {}) {
    console.log('🔍 开始创建窗口...');

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
            if (config.html) {

            } else {
                console.log('📊 使用组件模式渲染');
                win.webContents.send('render-dynamic-gui', config);
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

            // 发送默认配置
            if (!config.html && config.components && config.components.length > 0) win.webContents.send('render-dynamic-gui', config || {
                title: '加载中...',
                components: [{
                    type: 'heading',
                    text: '页面加载中...',
                    level: 2,
                    className: 'text-xl text-gray-600'
                }]
            });

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
    });

    return win;
}

// 暴露给全局，供 MCP 服务器调用
global.createWindow = async(config = {}) => {
    console.log('🌐 通过 MCP 调用创建窗口');

    // 检查是否已有窗口，如果有则关闭
    const existingWindows = BrowserWindow.getAllWindows();
    if (existingWindows.length > 0) {
        console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，正在关闭...`);
        existingWindows.forEach(win => {
            if (!win.isDestroyed()) {
                win.close();
            }
        });
    }

    return await createWindow(config);
};

app.whenReady().then(async() => {
    // 初始化 SSE MCP 服务器
    try {
        const { sseServer: createSSEServer } = await initializeSSEMCPServer();
        sseServer = createSSEServer(3000);
        console.log('✅ SSE MCP 服务器已启动');
    } catch (error) {
        console.error('❌ SSE MCP 服务器启动失败:', error);
    }

    // 创建主窗口（可选，也可以完全由 MCP 调用创建）
    mainWindow = await createWindow({
        title: 'NexusGUI - 等待 AI 指令',
        components: [{
            type: 'container',
            className: 'welcome-container p-8 text-center',
            children: [{
                    type: 'heading',
                    text: '🚀 NexusGUI 已就绪',
                    level: 1,
                    className: 'text-3xl font-bold mb-4 text-blue-600'
                },
                {
                    type: 'text',
                    text: '等待 AI 通过 MCP 发送界面定义...',
                    className: 'text-gray-600 mb-6'
                },
                {
                    type: 'card',
                    title: '系统状态',
                    className: 'max-w-md mx-auto',
                    children: [{
                            type: 'text',
                            text: `✅ SSE MCP 服务器: ${sseServer ? '运行中' : '未启动'}`,
                            className: 'text-sm text-green-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: sseServer ? '📍 服务器地址: http://localhost:3000' : '❌ 服务器未启动',
                            className: 'text-sm text-blue-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: sseServer ? '🔗 SSE 端点: /mcp' : '',
                            className: 'text-sm text-blue-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: sseServer ? '📨 消息端点: /messages' : '',
                            className: 'text-sm text-blue-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: '✅ 渲染引擎: 已就绪',
                            className: 'text-sm text-green-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: '✅ 组件库: 已加载',
                            className: 'text-sm text-green-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: `🖥️ 平台: ${process.platform}`,
                            className: 'text-sm text-gray-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: `📦 Node.js: ${process.version}`,
                            className: 'text-sm text-gray-600'
                        }
                    ]
                }
            ]
        }]
    });

    app.on('activate', async() => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = await createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // 关闭 SSE MCP 服务器
        if (sseServer) {
            sseServer.close();
        }
        app.quit();
    }
});

// IPC 处理程序
ipcMain.handle('mcp-result', async(event, result) => {
    console.log('📤 收到来自渲染进程的结果:', result);
    // 这里可以将结果发送回 MCP 客户端
    return { success: true };
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