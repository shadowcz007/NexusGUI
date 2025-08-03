// 生成会话管理窗口HTML
function generateSessionManagerHTML() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 服务器 - 会话管理</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 700px;
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
            color: #10b981;
            margin-bottom: 10px;
        }
        .session-list {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .session-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #10b981;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .session-info {
            flex: 1;
        }
        .session-id {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .session-status {
            font-size: 0.9rem;
            color: #666;
        }
        .session-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            font-weight: 500;
        }
        .btn-info {
            background: #3b82f6;
            color: white;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        .btn:hover {
            opacity: 0.8;
        }
        .empty-state {
            text-align: center;
            color: #666;
            padding: 40px 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            border-left: 4px solid #10b981;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #10b981;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">📋 MCP 会话管理</h1>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">0</div>
                <div class="stat-label">活动会话</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">0</div>
                <div class="stat-label">总连接数</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">0</div>
                <div class="stat-label">消息处理</div>
            </div>
        </div>
        
        <div class="session-list">
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                <div>当前没有活动的MCP会话</div>
                <div style="font-size: 0.9rem; color: #999; margin-top: 10px;">
                    会话将在客户端连接时显示在这里
                </div>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button class="btn btn-info" onclick="location.reload()">🔄 刷新会话列表</button>
        </div>
    </div>
    
    <script>
        // 模拟会话数据更新
        setTimeout(() => {
            // 这里可以通过API获取实际的会话数据
            console.log('会话管理器已加载');
        }, 1000);
    </script>
</body>
</html>`;
}


module.exports =  { generateSessionManagerHTML };