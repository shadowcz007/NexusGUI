const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeSSEMCPServer } = require('./mcp-server-sse-wrapper.js');

// __dirname 在 CommonJS 中已经可用

let mainWindow;
let sseServer;

// 统一 GUI 创建函数
async function createWindow(config = {}) {
    const win = new BrowserWindow({
        width: config.width || 800,
        height: config.height || 600,
        title: config.title || 'NexusGUI - 动态界面',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        show: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets', 'icon.png') // 可选图标
    });

    await win.loadFile('index.html');

    // 等待页面加载完成后发送配置
    win.webContents.once('did-finish-load', () => {
        win.webContents.send('render-dynamic-gui', config);
        win.show();
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        win.webContents.openDevTools();
    }

    return win;
}

// 暴露给全局，供 MCP 服务器调用
global.createWindow = createWindow;

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
                            text: '✅ 渲染引擎: 已就绪',
                            className: 'text-sm text-green-600 mb-2'
                        },
                        {
                            type: 'text',
                            text: '✅ 组件库: 已加载',
                            className: 'text-sm text-green-600'
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