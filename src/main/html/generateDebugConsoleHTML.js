/**
 * 生成调试控制台 HTML
 * @param {Array} logs - 日志条目数组
 * @returns {string} HTML 内容
 */
function generateDebugConsoleHTML(logs = []) {
    // 将日志条目转换为 HTML
    const logEntriesHTML = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
        const levelClass = log.level.toLowerCase();
        const moduleClass = log.module.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        return `
            <div class="log-entry ${levelClass} ${moduleClass}">
                <div class="log-header">
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-level ${levelClass}">${log.level}</span>
                    <span class="log-module ${moduleClass}">${log.module}</span>
                </div>
                <div class="log-message">${log.message}</div>
                ${log.context && Object.keys(log.context).length > 0 ? 
                    `<div class="log-context">${JSON.stringify(log.context, null, 2)}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>调试控制台</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            background: #2d2d30;
            padding: 15px 20px;
            border-bottom: 1px solid #3c3c40;
        }
        .title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #cccccc;
            margin-bottom: 10px;
        }
        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }
        .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            background: #3c3c40;
            color: #cccccc;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: #4d4d50;
        }
        .btn-primary {
            background: #007acc;
        }
        .btn-primary:hover {
            background: #0099ff;
        }
        .stats {
            display: flex;
            gap: 20px;
            font-size: 0.9rem;
            color: #999999;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .stat-value {
            font-weight: 600;
            color: #cccccc;
        }
        .filters {
            display: flex;
            gap: 15px;
            margin-top: 10px;
        }
        .filter-checkbox {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9rem;
        }
        .filter-checkbox input {
            margin: 0;
        }
        .log-container {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        .log-entry {
            padding: 10px;
            margin-bottom: 5px;
            border-radius: 4px;
            background: #2d2d30;
            border-left: 3px solid #3c3c40;
        }
        .log-entry.error {
            border-left-color: #f48771;
            background: #36282b;
        }
        .log-entry.warn {
            border-left-color: #e2c08d;
            background: #39352a;
        }
        .log-entry.info {
            border-left-color: #75beff;
            background: #293242;
        }
        .log-entry.debug {
            border-left-color: #c5c5c5;
            background: #2d2d30;
        }
        .log-header {
            display: flex;
            gap: 15px;
            margin-bottom: 5px;
            font-size: 0.85rem;
        }
        .log-timestamp {
            color: #999999;
        }
        .log-level {
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8rem;
        }
        .log-level.error {
            color: #ffffff;
            background: #f48771;
        }
        .log-level.warn {
            color: #000000;
            background: #e2c08d;
        }
        .log-level.info {
            color: #ffffff;
            background: #75beff;
        }
        .log-level.debug {
            color: #000000;
            background: #c5c5c5;
        }
        .log-module {
            color: #d7ba7d;
            font-weight: 600;
        }
        .log-message {
            font-size: 0.95rem;
            line-height: 1.4;
            color: #d4d4d4;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .log-context {
            margin-top: 8px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
            font-size: 0.85rem;
            color: #999999;
            white-space: pre-wrap;
        }
        .footer {
            background: #2d2d30;
            padding: 10px 20px;
            border-top: 1px solid #3c3c40;
            font-size: 0.85rem;
            color: #999999;
            display: flex;
            justify-content: space-between;
        }
        .auto-scroll {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .auto-scroll input {
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔧 NexusGUI 调试控制台</div>
            
            <div class="controls">
                <button class="btn btn-primary" onclick="refreshLogs()">🔄 刷新日志</button>
                <button class="btn" onclick="clearLogs()">🗑️ 清空日志</button>
                <button class="btn" onclick="toggleAutoRefresh()">⏱️ 自动刷新</button>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <span>总日志:</span>
                    <span class="stat-value">${logs.length}</span>
                </div>
                <div class="stat-item">
                    <span>错误:</span>
                    <span class="stat-value">${logs.filter(log => log.level === 'ERROR').length}</span>
                </div>
                <div class="stat-item">
                    <span>警告:</span>
                    <span class="stat-value">${logs.filter(log => log.level === 'WARN').length}</span>
                </div>
            </div>
            
            <div class="filters">
                <div class="filter-checkbox">
                    <input type="checkbox" id="filter-error" checked onchange="filterLogs()">
                    <label for="filter-error">错误</label>
                </div>
                <div class="filter-checkbox">
                    <input type="checkbox" id="filter-warn" checked onchange="filterLogs()">
                    <label for="filter-warn">警告</label>
                </div>
                <div class="filter-checkbox">
                    <input type="checkbox" id="filter-info" checked onchange="filterLogs()">
                    <label for="filter-info">信息</label>
                </div>
                <div class="filter-checkbox">
                    <input type="checkbox" id="filter-debug" onchange="filterLogs()">
                    <label for="filter-debug">调试</label>
                </div>
            </div>
        </div>
        
        <div class="log-container" id="logContainer">
            ${logEntriesHTML || '<div class="log-entry"><div class="log-message">暂无日志</div></div>'}
        </div>
        
        <div class="footer">
            <div>NexusGUI 调试控制台</div>
            <div class="auto-scroll">
                <input type="checkbox" id="autoScroll" checked>
                <label for="autoScroll">自动滚动</label>
            </div>
        </div>
    </div>
    
    <script>
        let autoRefreshInterval = null;
        let isAutoRefreshEnabled = false;
        
        function refreshLogs() {
            // 在实际应用中，这里会调用主进程获取最新日志
            console.log('刷新日志...');
            // 模拟刷新效果
            location.reload();
        }
        
        function clearLogs() {
            if (confirm('确定要清空所有日志吗？')) {
                document.getElementById('logContainer').innerHTML = '<div class="log-entry"><div class="log-message">日志已清空</div></div>';
            }
        }
        
        function toggleAutoRefresh() {
            isAutoRefreshEnabled = !isAutoRefreshEnabled;
            if (isAutoRefreshEnabled) {
                autoRefreshInterval = setInterval(refreshLogs, 5000);
                console.log('自动刷新已启用');
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
                console.log('自动刷新已禁用');
            }
        }
        
        function filterLogs() {
            // 在实际应用中，这里会根据过滤器显示/隐藏日志条目
            console.log('过滤日志...');
        }
        
        // 自动滚动到底部
        function scrollToBottom() {
            const container = document.getElementById('logContainer');
            if (document.getElementById('autoScroll').checked) {
                container.scrollTop = container.scrollHeight;
            }
        }
        
        // 页面加载完成后滚动到底部
        document.addEventListener('DOMContentLoaded', () => {
            scrollToBottom();
        });
        
        console.log('🎨 调试控制台已加载');
    </script>
</body>
</html>`;
}

module.exports = { generateDebugConsoleHTML };