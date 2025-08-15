// 生成服务器设置窗口HTML
function generateServerSettingsHTML(currentSettings) {
  
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 服务器 - 设置</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 600px;
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
            color: #f59e0b;
            margin-bottom: 10px;
        }
        .setting-group {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        .setting-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
        }
        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .setting-item:last-child {
            border-bottom: none;
        }
        .setting-label {
            font-weight: 500;
            color: #666;
        }
        .setting-control {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        input[type="number"], input[type="text"], select {
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.9rem;
            width: 120px;
        }
        .toggle {
            position: relative;
            width: 50px;
            height: 24px;
            background: #d1d5db;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .toggle.active {
            background: #f59e0b;
        }
        .toggle::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s;
        }
        .toggle.active::after {
            transform: translateX(26px);
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s;
        }
        .btn-primary {
            background: #f59e0b;
            color: white;
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .btn:hover {
            opacity: 0.8;
            transform: translateY(-1px);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .actions {
            text-align: center;
            margin-top: 30px;
        }
        .status-message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
            display: none;
        }
        .status-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .status-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #f59e0b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">⚙️ 服务器设置</h1>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">网络设置</div>
            <div class="setting-item">
                <span class="setting-label">监听端口</span>
                <div class="setting-control">
                    <input type="number" id="server-port" value="${currentSettings.server.port}" min="1000" max="65535">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用CORS</span>
                <div class="setting-control">
                    <div class="toggle ${currentSettings.server.enableCors ? 'active' : ''}" id="enable-cors" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">最大并发连接</span>
                <div class="setting-control">
                    <input type="number" id="max-connections" value="${currentSettings.server.maxConnections}" min="1" max="10000">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">会话超时(秒)</span>
                <div class="setting-control">
                    <input type="number" id="session-timeout" value="${currentSettings.server.sessionTimeout}" min="60" max="7200">
                </div>
            </div>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">日志设置</div>
            <div class="setting-item">
                <span class="setting-label">启用详细日志</span>
                <div class="setting-control">
                    <div class="toggle ${currentSettings.logging.enableVerbose ? 'active' : ''}" id="enable-verbose" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">日志级别</span>
                <div class="setting-control">
                    <select id="log-level">
                        <option value="debug" ${currentSettings.logging.level === 'debug' ? 'selected' : ''}>Debug</option>
                        <option value="info" ${currentSettings.logging.level === 'info' ? 'selected' : ''}>Info</option>
                        <option value="warn" ${currentSettings.logging.level === 'warn' ? 'selected' : ''}>Warning</option>
                        <option value="error" ${currentSettings.logging.level === 'error' ? 'selected' : ''}>Error</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">界面设置</div>
            <div class="setting-item">
                <span class="setting-label">始终置顶</span>
                <div class="setting-control">
                    <div class="toggle ${currentSettings.ui.alwaysOnTop ? 'active' : ''}" id="always-on-top" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">显示托盘图标</span>
                <div class="setting-control">
                    <div class="toggle ${currentSettings.ui.showInTray ? 'active' : ''}" id="show-in-tray" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">托盘菜单标题长度</span>
                <div class="setting-control">
                    <input type="number" id="tray-title-length" value="${currentSettings.ui.trayMenuTitleMaxLength || 30}" min="15" max="60" step="1">
                    <span class="setting-hint">字符数 (15-60)</span>
                </div>
            </div>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">LLM 设置</div>
            <div class="setting-item">
                <span class="setting-label">启用 LLM 功能</span>
                <div class="setting-control">
                    <div class="toggle ${currentSettings.llm.enabled ? 'active' : ''}" id="llm-enabled" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">API URL</span>
                <div class="setting-control">
                    <input type="text" id="llm-api-url" value="${currentSettings.llm.apiUrl}" placeholder="https://api.openai.com/v1/chat/completions">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">API Key</span>
                <div class="setting-control">
                    <input type="password" id="llm-api-key" value="${currentSettings.llm.apiKey}" placeholder="sk-...">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">模型名称</span>
                <div class="setting-control">
                    <input type="text" id="llm-model" value="${currentSettings.llm.model}" placeholder="gpt-4, gpt-3.5-turbo, etc.">
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" id="save-btn" onclick="saveSettings()">💾 保存设置</button>
            <button class="btn btn-secondary" id="reset-btn" onclick="resetSettings()">🔄 重置默认</button>
        </div>
        
        <div class="status-message" id="status-message"></div>
    </div>
    
    <script>
        function toggleSetting(element) {
            element.classList.toggle('active');
        }
        
        function showStatus(message, isError = false) {
            const statusEl = document.getElementById('status-message');
            statusEl.textContent = message;
            statusEl.className = 'status-message ' + (isError ? 'status-error' : 'status-success');
            statusEl.style.display = 'block';
            
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
        
        function setLoading(isLoading) {
            const saveBtn = document.getElementById('save-btn');
            const resetBtn = document.getElementById('reset-btn');
            
            if (isLoading) {
                saveBtn.innerHTML = '<span class="loading"></span>保存中...';
                saveBtn.disabled = true;
                resetBtn.disabled = true;
            } else {
                saveBtn.innerHTML = '💾 保存设置';
                saveBtn.disabled = false;
                resetBtn.disabled = false;
            }
        }
        
        async function saveSettings() {
            try {
                setLoading(true);
                
                // 收集所有设置
                const settings = {
                    'server.port': parseInt(document.getElementById('server-port').value),
                    'server.enableCors': document.getElementById('enable-cors').classList.contains('active'),
                    'server.maxConnections': parseInt(document.getElementById('max-connections').value),
                    'server.sessionTimeout': parseInt(document.getElementById('session-timeout').value),
                    'logging.enableVerbose': document.getElementById('enable-verbose').classList.contains('active'),
                    'logging.level': document.getElementById('log-level').value,
                    'ui.alwaysOnTop': document.getElementById('always-on-top').classList.contains('active'),
                    'ui.showInTray': document.getElementById('show-in-tray').classList.contains('active'),
                    'ui.trayMenuTitleMaxLength': parseInt(document.getElementById('tray-title-length').value),
                    'llm.enabled': document.getElementById('llm-enabled').classList.contains('active'),
                    'llm.apiUrl': document.getElementById('llm-api-url').value,
                    'llm.apiKey': document.getElementById('llm-api-key').value,
                    'llm.model': document.getElementById('llm-model').value
                };
                
                console.log('保存设置:', settings);
                
                // 调用主进程保存设置
                const result = await window.electronAPI.invoke('save-settings', settings);
                
                if (result.success) {
                    let message = result.message;
                    if (result.serverRestarted) {
                        message += '\\n服务器已在新端口上重启';
                    }
                    showStatus(message);
                } else {
                    showStatus('保存失败: ' + result.error, true);
                    if (result.details) {
                        console.error('验证错误:', result.details);
                    }
                }
            } catch (error) {
                console.error('保存设置时出错:', error);
                showStatus('保存设置时出错: ' + error.message, true);
            } finally {
                setLoading(false);
            }
        }
        
        async function resetSettings() {
            if (!confirm('确定要重置为默认设置吗？这将覆盖所有当前设置。')) {
                return;
            }
            
            try {
                setLoading(true);
                
                const result = await window.electronAPI.invoke('reset-settings');
                
                if (result.success) {
                    showStatus(result.message);
                    // 延迟刷新页面以显示新的默认值
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    showStatus('重置失败: ' + result.error, true);
                }
            } catch (error) {
                console.error('重置设置时出错:', error);
                showStatus('重置设置时出错: ' + error.message, true);
            } finally {
                setLoading(false);
            }
        }
        
        // 页面加载完成后的初始化
        document.addEventListener('DOMContentLoaded', () => {
            console.log('设置页面已加载');
            
            // 检查 electronAPI 是否可用
            if (!window.electronAPI) {
                showStatus('无法连接到主进程，设置功能不可用', true);
                document.getElementById('save-btn').disabled = true;
                document.getElementById('reset-btn').disabled = true;
            }
        });
    </script>
</body>
</html>`;
}


module.exports =  { generateServerSettingsHTML}