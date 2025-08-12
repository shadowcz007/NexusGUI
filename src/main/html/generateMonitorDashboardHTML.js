/**
 * 生成实时监控面板 HTML
 * @param {object} monitorData - 监控数据
 * @param {object} serverInfo - 服务器信息
 * @param {object} networkStatus - 网络状态
 * @returns {string} HTML 内容
 */
function generateMonitorDashboardHTML(monitorData, serverInfo, networkStatus) {
    // 格式化内存大小
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 格式化时间
    const formatTime = (seconds) => {
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        let result = '';
        if (days > 0) result += days + '天 ';
        if (hours > 0) result += hours + '小时 ';
        if (minutes > 0) result += minutes + '分钟 ';
        result += seconds + '秒';

        return result.trim();
    };

    // 服务器状态
    const serverStatus = serverInfo.status === 'running' ? '🟢 运行中' : '🔴 已停止';
    const serverPort = serverInfo.port || '未知';
    
    // 网络状态
    const connectionStatus = networkStatus.connected ? '🔗 已连接' : '❌ 未连接';
    const activeSessions = networkStatus.activeSessions || 0;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>实时监控面板</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%);
            color: #ecf0f1;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #3498db, #2ecc71);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: #bdc3c7;
            font-size: 1.1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            background: rgba(255, 255, 255, 0.15);
        }
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .card-icon {
            font-size: 1.8rem;
            margin-right: 15px;
            width: 40px;
            text-align: center;
        }
        .card-title {
            font-size: 1.4rem;
            font-weight: 600;
        }
        .metric {
            margin-bottom: 15px;
        }
        .metric-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.95rem;
            color: #bdc3c7;
        }
        .metric-value {
            font-size: 1.3rem;
            font-weight: 600;
            color: #3498db;
        }
        .metric-value.warning {
            color: #f39c12;
        }
        .metric-value.error {
            color: #e74c3c;
        }
        .metric-value.success {
            color: #2ecc71;
        }
        .progress-bar {
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .progress-fill.low {
            background: #2ecc71;
        }
        .progress-fill.medium {
            background: #f39c12;
        }
        .progress-fill.high {
            background: #e74c3c;
        }
        .list {
            list-style: none;
        }
        .list-item {
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .list-item:last-child {
            border-bottom: none;
        }
        .list-label {
            font-size: 0.9rem;
            color: #bdc3c7;
            margin-bottom: 5px;
        }
        .list-value {
            font-size: 1.1rem;
            font-weight: 500;
        }
        .refresh-controls {
            text-align: center;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .timestamp {
            text-align: center;
            margin-top: 20px;
            color: #7f8c8d;
            font-size: 0.9rem;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">📊 实时监控面板</h1>
            <p class="subtitle">NexusGUI 系统状态和资源使用情况</p>
        </div>

        <div class="grid">
            <!-- 服务器状态卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🖥️</div>
                    <div class="card-title">服务器状态</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>状态</span>
                    </div>
                    <div class="metric-value ${serverInfo.status === 'running' ? 'success pulse' : 'error'}">
                        ${serverStatus}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>端口</span>
                    </div>
                    <div class="metric-value">
                        ${serverPort}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>版本</span>
                    </div>
                    <div class="metric-value">
                        ${serverInfo.version || '0.1.0'}
                    </div>
                </div>
                ${serverInfo.startTime ? `
                <div class="metric">
                    <div class="metric-label">
                        <span>运行时间</span>
                    </div>
                    <div class="metric-value">
                        ${formatTime((new Date() - new Date(serverInfo.startTime)) / 1000)}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- 网络状态卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🌐</div>
                    <div class="card-title">网络状态</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>连接状态</span>
                    </div>
                    <div class="metric-value ${networkStatus.connected ? 'success' : 'error'}">
                        ${connectionStatus}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>活动会话</span>
                    </div>
                    <div class="metric-value ${activeSessions > 0 ? 'success' : ''}">
                        ${activeSessions}
                    </div>
                </div>
                ${networkStatus.lastActivity ? `
                <div class="metric">
                    <div class="metric-label">
                        <span>最后活动</span>
                    </div>
                    <div class="metric-value">
                        ${new Date(networkStatus.lastActivity).toLocaleString('zh-CN')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- CPU 使用情况卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">⚙️</div>
                    <div class="card-title">CPU 使用情况</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>使用率</span>
                        <span>${monitorData.cpu.usage}%</span>
                    </div>
                    <div class="metric-value ${monitorData.cpu.usage > 80 ? 'warning' : ''}">
                        ${monitorData.cpu.usage}%
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${monitorData.cpu.usage < 50 ? 'low' : monitorData.cpu.usage < 80 ? 'medium' : 'high'}" 
                             style="width: ${monitorData.cpu.usage}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>核心数</span>
                    </div>
                    <div class="metric-value">
                        ${monitorData.cpu.cores}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>型号</span>
                    </div>
                    <div class="metric-value" style="font-size: 0.8rem;">
                        ${monitorData.cpu.model.substring(0, 30)}${monitorData.cpu.model.length > 30 ? '...' : ''}
                    </div>
                </div>
            </div>

            <!-- 内存使用情况卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">💾</div>
                    <div class="card-title">内存使用情况</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>使用率</span>
                        <span>${monitorData.memory.usagePercent}%</span>
                    </div>
                    <div class="metric-value ${monitorData.memory.usagePercent > 80 ? 'warning' : ''}">
                        ${monitorData.memory.usagePercent}%
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${monitorData.memory.usagePercent < 50 ? 'low' : monitorData.memory.usagePercent < 80 ? 'medium' : 'high'}" 
                             style="width: ${monitorData.memory.usagePercent}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>已使用</span>
                    </div>
                    <div class="metric-value">
                        ${formatBytes(monitorData.memory.used)}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>总计</span>
                    </div>
                    <div class="metric-value">
                        ${formatBytes(monitorData.memory.total)}
                    </div>
                </div>
            </div>

            <!-- 系统负载卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">📈</div>
                    <div class="card-title">系统负载</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>1分钟</span>
                    </div>
                    <div class="metric-value ${monitorData.load['1min'] > 1 ? 'warning' : ''}">
                        ${monitorData.load['1min'].toFixed(2)}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>5分钟</span>
                    </div>
                    <div class="metric-value ${monitorData.load['5min'] > 1 ? 'warning' : ''}">
                        ${monitorData.load['5min'].toFixed(2)}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>15分钟</span>
                    </div>
                    <div class="metric-value ${monitorData.load['15min'] > 1 ? 'warning' : ''}">
                        ${monitorData.load['15min'].toFixed(2)}
                    </div>
                </div>
            </div>

            <!-- 系统信息卡片 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">ℹ️</div>
                    <div class="card-title">系统信息</div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>平台</span>
                    </div>
                    <div class="metric-value">
                        ${monitorData.system.platform} (${monitorData.system.arch})
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>主机名</span>
                    </div>
                    <div class="metric-value">
                        ${monitorData.system.hostname}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">
                        <span>运行时间</span>
                    </div>
                    <div class="metric-value">
                        ${formatTime(monitorData.system.uptime)}
                    </div>
                </div>
            </div>
        </div>

        <div class="refresh-controls">
            <button class="btn" onclick="refreshData()">🔄 刷新数据</button>
        </div>

        <div class="timestamp">
            最后更新: ${new Date(monitorData.timestamp).toLocaleString('zh-CN')}
        </div>
    </div>

    <script>
        function refreshData() {
            // 在实际应用中，这里会调用主进程获取最新数据
            console.log('刷新监控数据...');
            // 模拟刷新效果
            location.reload();
        }

        // 自动刷新
        setInterval(() => {
            refreshData();
        }, 30000); // 30秒自动刷新

        console.log('📊 实时监控面板已加载');
    </script>
</body>
</html>`;
}

module.exports = { generateMonitorDashboardHTML };