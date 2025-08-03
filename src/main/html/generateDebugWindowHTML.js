// 生成调试信息窗口HTML
function generateDebugWindowHTML() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 服务器 - 调试信息</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }
        .debug-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .section-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
        }
        .debug-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .debug-label {
            font-weight: 500;
            color: #666;
        }
        .debug-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        .log-container {
            background: #1f2937;
            color: #f9fafb;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
        }
        .refresh-btn:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🔧 MCP 服务器调试信息</h1>
        </div>
        
        <div class="debug-section">
            <div class="section-title">服务器状态</div>
            <div class="debug-item">
                <span class="debug-label">运行状态</span>
                <span class="debug-value">${mcpServerInfo?.status || '未知'}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">监听端口</span>
                <span class="debug-value">${mcpServerInfo?.port || '未知'}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">启动时间</span>
                <span class="debug-value">${mcpServerInfo?.startTime ? new Date(mcpServerInfo.startTime).toLocaleString('zh-CN') : '未知'}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">运行时长</span>
                <span class="debug-value">${mcpServerInfo?.startTime ? Math.floor((Date.now() - new Date(mcpServerInfo.startTime).getTime()) / 1000) + 's' : '未知'}</span>
            </div>
        </div>
        
        <div class="debug-section">
            <div class="section-title">系统信息</div>
            <div class="debug-item">
                <span class="debug-label">Node.js 版本</span>
                <span class="debug-value">${process.version}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">平台</span>
                <span class="debug-value">${process.platform}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">架构</span>
                <span class="debug-value">${process.arch}</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">内存使用</span>
                <span class="debug-value">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</span>
            </div>
        </div>
        
        <div class="debug-section">
            <div class="section-title">实时日志</div>
            <div class="log-container" id="logContainer">
                <div>🚀 MCP 服务器调试日志</div>
                <div>📊 等待日志更新...</div>
            </div>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 刷新调试信息</button>
    </div>
    
    <script>
        // 模拟日志更新
        let logCounter = 0;
        setInterval(() => {
            const logContainer = document.getElementById('logContainer');
            logCounter++;
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            const logEntry = document.createElement('div');
            logEntry.textContent = \`[\${timestamp}] 调试信息 #\${logCounter} - 服务器运行正常\`;
            logContainer.appendChild(logEntry);
            
            // 保持最新的日志在底部
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // 限制日志条数
            if (logContainer.children.length > 50) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }, 2000);
    </script>
</body>
</html>`;
}

module.exports =  {generateDebugWindowHTML}
