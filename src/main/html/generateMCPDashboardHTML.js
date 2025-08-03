// 生成MCP服务器仪表板HTML
function generateMCPDashboardHTML(mcpInfo) {
    const statusColor = mcpInfo.status === 'running' ? '#10b981' : '#ef4444';
    const statusIcon = mcpInfo.status === 'running' ? '✅' : '❌';
    const statusText = mcpInfo.status === 'running' ? '运行中' : '启动失败';

    const endpointsHTML = mcpInfo.endpoints.map(endpoint => `
        <div class="endpoint-item">
            <div class="endpoint-name">${endpoint.name}</div>
            <div class="endpoint-path">http://localhost:${mcpInfo.port}${endpoint.path}</div>
            <div class="endpoint-desc">${endpoint.description}</div>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexusGUI - MCP 服务器控制台</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
            backdrop-filter: blur(10px);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border-left: 4px solid ${statusColor};
        }
        
        .status-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .status-icon {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .status-text {
            font-size: 1.3rem;
            font-weight: 600;
            color: ${statusColor};
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .info-label {
            font-weight: 500;
            color: #666;
        }
        
        .info-value {
            font-weight: 600;
            color: #333;
        }
        
        .endpoints-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .endpoints-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
        }
        
        .endpoints-title::before {
            content: '🔗';
            margin-right: 10px;
        }
        
        .endpoint-item {
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            border-left: 3px solid #3b82f6;
        }
        
        .endpoint-name {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .endpoint-path {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #e5e7eb;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
            margin-bottom: 5px;
            word-break: break-all;
        }
        
        .endpoint-desc {
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .error-card {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .error-title {
            color: #dc2626;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        
        .error-title::before {
            content: '⚠️';
            margin-right: 8px;
        }
        
        .error-message {
            color: #991b1b;
            font-family: 'Monaco', 'Menlo', monospace;
            background: #fee2e2;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.9rem;
        }
        
        .actions-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .actions-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
        }
        
        .actions-title::before {
            content: '⚡';
            margin-right: 10px;
        }
        
        .action-buttons {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-1px);
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9rem;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🚀 NexusGUI</h1>
            <p class="subtitle">Model Context Protocol 服务器控制台</p>
        </div>
        
        <div class="status-card">
            <div class="status-header">
                <span class="status-icon ${mcpInfo.status === 'running' ? 'pulse' : ''}">${statusIcon}</span>
                <span class="status-text">MCP 服务器 ${statusText}</span>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">服务器名称</span>
                    <span class="info-value">${mcpInfo.serverName || 'nexusgui-sse-server'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">版本</span>
                    <span class="info-value">${mcpInfo.version || '0.1.0'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">监听端口</span>
                    <span class="info-value">${mcpInfo.port}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">启动时间</span>
                    <span class="info-value">${new Date(mcpInfo.startTime).toLocaleString('zh-CN')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">平台</span>
                    <span class="info-value">${process.platform}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Node.js</span>
                    <span class="info-value">${process.version}</span>
                </div>
            </div>
        </div>
        
        ${mcpInfo.error ? `
        <div class="error-card">
            <div class="error-title">启动错误</div>
            <div class="error-message">${mcpInfo.error}</div>
        </div>
        ` : ''}
        
        ${mcpInfo.status === 'running' ? `
        <div class="endpoints-card">
            <div class="endpoints-title">API 端点</div>
            ${endpointsHTML}
        </div>
        ` : ''}
        
        <div class="actions-card">
            <div class="actions-title">快速操作</div>
            <div class="action-buttons">
                ${mcpInfo.status === 'running' ? `
                <button class="btn btn-primary" onclick="openHealthCheck()">健康检查</button>
                <button class="btn btn-primary" onclick="openDebugInfo()">调试信息</button>
                ` : ''}
                <button class="btn btn-secondary" onclick="refreshStatus()">刷新状态</button>
                <button class="btn btn-secondary" onclick="openDevTools()">开发者工具</button>
            </div>
        </div>
        
        <div class="footer">
            <p>NexusGUI - 由 AI 驱动的动态界面生成器</p>
            <p>等待 AI 通过 MCP 协议发送界面定义...</p>
        </div>
    </div>
    
    <script>
        function openHealthCheck() {
            window.open('http://localhost:${mcpInfo.port}/health', '_blank');
        }
        
        function openDebugInfo() {
            window.open('http://localhost:${mcpInfo.port}/debug/sessions', '_blank');
        }
        
        function refreshStatus() {
            location.reload();
        }
        
        function openDevTools() {
            if (window.electronAPI) {
                window.electronAPI.send('open-dev-tools');
            }
        }
        
        // 定期更新状态
        setInterval(() => {
            const statusElements = document.querySelectorAll('.pulse');
            statusElements.forEach(el => {
                el.style.opacity = el.style.opacity === '0.7' ? '1' : '0.7';
            });
        }, 1000);
        
        console.log('🎨 NexusGUI MCP 控制台已加载');
        console.log('📊 服务器状态:', ${JSON.stringify(mcpInfo)});
    </script>
</body>
</html>`;
}

module.exports =  {generateMCPDashboardHTML}