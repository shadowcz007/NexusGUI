const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createDiagnosticWindow() {
    console.log('🔍 创建诊断窗口...');

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'NexusGUI 诊断工具',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    console.log('📱 加载 index.html...');
    mainWindow.loadFile('index.html');

    mainWindow.webContents.once('did-finish-load', () => {
        console.log('✅ 页面加载完成');
        mainWindow.show();
        mainWindow.focus();
        console.log('✅ 诊断窗口已显示');

        // 发送诊断配置
        mainWindow.webContents.send('render-dynamic-gui', {
            title: 'NexusGUI 诊断工具',
            components: [{
                type: 'heading',
                text: 'NexusGUI 诊断工具',
                level: 1,
                className: 'text-3xl font-bold text-blue-600 mb-4'
            }, {
                type: 'text',
                text: '点击下面的按钮来检查系统状态',
                className: 'text-gray-600 mb-4'
            }, {
                type: 'button',
                text: '检查窗口状态',
                onClick: 'checkWindowStatus',
                className: 'btn-primary mb-2'
            }, {
                type: 'button',
                text: '测试窗口创建',
                onClick: 'testWindowCreation',
                className: 'btn-secondary mb-2'
            }, {
                type: 'button',
                text: '检查系统信息',
                onClick: 'checkSystemInfo',
                className: 'btn-success'
            }]
        });
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ 页面加载失败:', errorCode, errorDescription);
    });

    mainWindow.on('ready-to-show', () => {
        console.log('✅ 窗口准备显示');
    });

    mainWindow.on('show', () => {
        console.log('✅ 窗口已显示');
    });

    mainWindow.on('focus', () => {
        console.log('✅ 窗口已聚焦');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC 处理程序
ipcMain.handle('check-window-status', async() => {
    const windows = BrowserWindow.getAllWindows();
    const status = {
        windowCount: windows.length,
        windows: windows.map(win => ({
            id: win.id,
            title: win.getTitle(),
            isVisible: win.isVisible(),
            isDestroyed: win.isDestroyed(),
            bounds: win.getBounds(),
            isFocused: win.isFocused()
        }))
    };
    console.log('📊 窗口状态:', status);
    return status;
});

ipcMain.handle('test-window-creation', async() => {
    console.log('🧪 测试窗口创建...');

    try {
        const testWin = new BrowserWindow({
            width: 400,
            height: 300,
            title: '测试窗口',
            show: false
        });

        testWin.loadFile('index.html');

        testWin.webContents.once('did-finish-load', () => {
            testWin.show();
            testWin.focus();
            console.log('✅ 测试窗口创建成功');
        });

        return { success: true, message: '测试窗口创建成功' };
    } catch (error) {
        console.error('❌ 测试窗口创建失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-system-info', async() => {
    const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        appPath: app.getAppPath(),
        appName: app.getName(),
        appVersion: app.getVersion()
    };
    console.log('📊 系统信息:', info);
    return info;
});

ipcMain.handle('mcp-result', async(event, result) => {
    console.log('📤 收到结果:', result);
    return { success: true };
});

app.whenReady().then(() => {
    console.log('🚀 应用就绪，创建诊断窗口');
    createDiagnosticWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createDiagnosticWindow();
    }
});

console.log('🔧 诊断工具已启动');