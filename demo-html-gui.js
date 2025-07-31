#!/usr/bin/env node

/**
 * NexusGUI HTML 模式演示
 * 展示如何使用 HTML 直接渲染界面
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// 测试 HTML GUI 功能
async function testHTMLGUI() {
    // 确保 app 已准备就绪
    if (!app.isReady()) {
        await new Promise(resolve => app.once('ready', resolve));
    }

    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/main/preload.js')
        }
    });

    await win.loadFile(path.join(__dirname, 'src/renderer/index.html'));

    win.webContents.once('did-finish-load', () => {
        // 测试 HTML 模式
        win.webContents.send('render-html-gui', {
            title: '工资历年涨幅',
            html: `
    <div style="width: 80%; margin: auto;">
        <canvas id="myChart"></canvas>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        const ctx = document.getElementById('myChart').getContext('2d');
        const years = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
        const salaries = [50000, 52000, 55000, 58000, 62000, 65000, 68000, 72000, 75000, 80000, 85000, 90000, 95000, 100000];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: '工资 (USD)',
                    data: salaries,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '历年工资涨幅'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '工资'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '年份'
                        }
                    }
                }
            }
        });
    </script>
`
        });
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        win.webContents.openDevTools();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    app.whenReady().then(() => {
        testHTMLGUI();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

module.exports = { testHTMLGUI };