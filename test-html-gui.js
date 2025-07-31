const { spawn } = require('child_process');
const path = require('path');

// 启动 Electron 应用
const electronPath = require('electron');
const appPath = path.join(__dirname);

console.log('🚀 启动 Electron 应用测试 HTML GUI...');

const child = spawn(electronPath, [appPath, '--dev'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// 监听输出
child.stdout.on('data', (data) => {
    console.log('📤 主进程输出:', data.toString());
});

child.stderr.on('data', (data) => {
    console.log('❌ 主进程错误:', data.toString());
});

// 等待应用启动
setTimeout(() => {
    console.log('⏰ 等待应用启动完成...');

    // 模拟 MCP 调用
    const testConfig = {
        title: "工资历年涨幅",
        width: 800,
        height: 600,
        alwaysOnTop: true,
        showMenuBar: false,
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
    };

    console.log('📊 测试配置:', {
        title: testConfig.title,
        htmlLength: testConfig.html.length,
        hasHtml: !!testConfig.html
    });

    // 这里应该通过 MCP 协议发送配置
    // 但由于这是测试文件，我们直接模拟
    console.log('✅ HTML GUI 测试配置已准备就绪');
    console.log('📄 HTML 内容长度:', testConfig.html.length);
    console.log('📄 HTML 内容预览:', testConfig.html.substring(0, 100) + '...');

}, 3000);

// 处理进程退出
child.on('close', (code) => {
    console.log(`🏁 应用已退出，退出码: ${code}`);
    process.exit(code);
});

// 处理错误
child.on('error', (error) => {
    console.error('❌ 启动应用时出错:', error);
    process.exit(1);
});

console.log('⏳ 等待应用启动...');