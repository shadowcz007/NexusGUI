const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { settingsManager } = require('../config/settings.js');
const i18n = require('../i18n');
const { serviceManager } = require('./managers/ServiceManager');

// 暴露给全局，供 MCP 服务器调用（保持向后兼容）
global.createWindow = async (config = {}) => {
    console.log('🌐 通过 MCP 调用创建窗口');
    
    try {
        // 确保服务管理器已初始化
        if (!serviceManager.isServiceManagerInitialized()) {
            await serviceManager.initialize();
        }
        
        const windowService = serviceManager.getService('window');
        return await windowService.createWindow(config);
    } catch (error) {
        console.error('❌ 全局创建窗口失败:', error);
        throw error;
    }
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

// 应用启动
app.whenReady().then(async () => {
    try {
        console.log('🚀 应用启动中...');
        
        // 启动所有服务
        await serviceManager.startAll();
        
        // 可选：显示主窗口
        if (process.argv.includes('--show-main-window')) {
            const windowService = serviceManager.getService('window');
            await windowService.showMCPConsole();
        }

        console.log('✅ 应用启动完成');

    } catch (error) {
        console.error('❌ 应用启动失败:', error);
        app.quit();
    }

    // macOS 激活事件
    app.on('activate', async () => {
        if (process.platform === 'darwin') {
            try {
                const windowService = serviceManager.getService('window');
                await windowService.showMCPConsole();
            } catch (error) {
                console.error('❌ 激活时显示控制台失败:', error);
            }
        }
    });
});

// 窗口关闭事件
app.on('window-all-closed', () => {
    try {
        const trayService = serviceManager.getService('tray');
        if (trayService.exists()) {
            console.log('✅ 所有窗口已关闭，应用继续在托盘中运行');
            return;
        }
    } catch (error) {
        console.error('❌ 检查托盘状态失败:', error);
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('before-quit', async () => {
    try {
        console.log('🧹 应用正在退出，清理资源...');
        await serviceManager.stopAll();
        console.log('✅ 应用正在退出，资源已清理');
    } catch (error) {
        console.error('❌ 清理资源时出错:', error);
    }
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
            const serverService = serviceManager.getService('server');
            const appStateService = serviceManager.getService('appState');
            
            const oldPort = appStateService.getState('mcpServerInfo').port;
            const newPort = settingsManager.getSetting('server.port');

            if (oldPort !== newPort) {
                console.log(`🔄 端口从 ${oldPort} 更改为 ${newPort}，需要重启服务器`);

                try {
                    await serverService.restart(newPort);
                    console.log(`✅ MCP 服务器已在新端口 ${newPort} 上重启`);
                } catch (error) {
                    console.error('❌ 重启服务器失败:', error);
                }
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
                const { readFileSync } = await import('fs');
                const guiConfig = JSON.parse(readFileSync(guiPath, 'utf8'));
                app.whenReady().then(async () => {
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

console.log('🚀 NexusGUI 主进程已启动');