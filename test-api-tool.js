/**
 * API 测试工具验证脚本
 * 用于测试新的 IPC 工具调用机制
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { generateAPITestToolHTML } = require('./src/main/html/generateAPITestToolHTML.js');

// 简单的测试函数
async function testAPITool() {
    console.log('🧪 开始测试 API 工具...');
    
    try {
        // 创建测试窗口
        const testWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            title: 'API 测试工具 - 测试模式',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'src/main/preload.js')
            },
            show: true
        });

        // 生成测试 HTML（空工具列表，让页面自己从主进程获取）
        const testHTML = generateAPITestToolHTML([]);
        
        // 加载 HTML
        await testWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHTML)}`);
        
        // 打开开发者工具以便调试
        testWindow.webContents.openDevTools();
        
        console.log('✅ API 测试工具窗口已创建');
        
        // 监听窗口关闭
        testWindow.on('closed', () => {
            console.log('🔒 测试窗口已关闭');
        });
        
        return testWindow;
        
    } catch (error) {
        console.error('❌ 测试 API 工具失败:', error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    app.whenReady().then(async () => {
        try {
            await testAPITool();
        } catch (error) {
            console.error('❌ 测试失败:', error);
            app.quit();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

module.exports = { testAPITool };