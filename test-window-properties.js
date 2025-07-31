// 测试窗口属性设置功能
const { createWindow } = require('./src/main/main.js');

async function testWindowProperties() {
    console.log('🧪 测试窗口属性设置功能...');

    // 测试1: 基本窗口属性
    console.log('\n📱 测试1: 基本窗口属性');
    await createWindow({
        title: '测试窗口 - 基本属性',
        width: 600,
        height: 400,
        showMenuBar: true,
        components: [{
                type: 'heading',
                text: '基本窗口属性测试',
                level: 1,
                className: 'text-2xl font-bold mb-4'
            },
            {
                type: 'text',
                text: '这个窗口显示了菜单栏',
                className: 'text-gray-600 mb-4'
            },
            {
                type: 'card',
                title: '窗口信息',
                content: '宽度: 600px, 高度: 400px, 显示菜单栏',
                className: 'mb-4'
            }
        ]
    });

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试2: 高级窗口属性
    console.log('\n🔧 测试2: 高级窗口属性');
    await createWindow({
        title: '测试窗口 - 高级属性',
        width: 500,
        height: 300,
        showMenuBar: false,
        alwaysOnTop: true,
        frame: false,
        resizable: false,
        opacity: 0.8,
        components: [{
                type: 'heading',
                text: '高级窗口属性测试',
                level: 1,
                className: 'text-2xl font-bold mb-4'
            },
            {
                type: 'text',
                text: '这个窗口是无边框、置顶、半透明、固定大小的',
                className: 'text-gray-600 mb-4'
            },
            {
                type: 'card',
                title: '特殊属性',
                content: '无边框、置顶、半透明、固定大小',
                className: 'mb-4'
            },
            {
                type: 'button',
                text: '关闭窗口',
                onClick: 'closeWindow',
                className: 'btn-danger'
            }
        ],
        callbacks: {
            'closeWindow': 'sendResult({ action: "close" });'
        }
    });

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试3: 全屏窗口
    console.log('\n🖥️ 测试3: 全屏窗口');
    await createWindow({
        title: '测试窗口 - 全屏',
        width: 800,
        height: 600,
        fullscreen: true,
        components: [{
                type: 'heading',
                text: '全屏窗口测试',
                level: 1,
                className: 'text-3xl font-bold mb-4 text-center'
            },
            {
                type: 'text',
                text: '这是一个全屏窗口',
                className: 'text-gray-600 mb-4 text-center'
            },
            {
                type: 'card',
                title: '全屏模式',
                content: '窗口以全屏模式显示',
                className: 'max-w-md mx-auto'
            }
        ]
    });

    console.log('\n✅ 所有窗口属性测试完成');
}

// 如果直接运行此文件
if (require.main === module) {
    const { app } = require('electron');

    app.whenReady().then(async() => {
        try {
            await testWindowProperties();
        } catch (error) {
            console.error('❌ 测试失败:', error);
        }
    });

    app.on('window-all-closed', () => {
        app.quit();
    });
}

module.exports = { testWindowProperties };