// 生成首次运行向导HTML
function generateStartupWizardHTML() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexusGUI - 首次运行向导</title>
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
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 500px;
            width: 100%;
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
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 1rem;
        }
        
        .options {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .option-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 2px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .option-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
            border-color: #3b82f6;
        }
        
        .option-card.selected {
            border-color: #3b82f6;
            background: #eff6ff;
        }
        
        .option-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .option-icon {
            font-size: 1.5rem;
            margin-right: 10px;
            width: 30px;
            text-align: center;
        }
        
        .option-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
        }
        
        .option-desc {
            color: #666;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .actions {
            display: flex;
            justify-content: center;
        }
        
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1rem;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .btn-primary:disabled {
            background: #93c5fd;
            cursor: not-allowed;
            transform: none;
        }
        
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #94a3b8;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🚀 欢迎使用 NexusGUI</h1>
            <p class="subtitle">请选择您的默认启动模式</p>
        </div>
        
        <div class="options">
            <div class="option-card" id="trayOption" onclick="selectOption('tray')">
                <div class="option-header">
                    <span class="option-icon">📌</span>
                    <span class="option-title">系统托盘模式</span>
                </div>
                <div class="option-desc">
                    应用启动后最小化到系统托盘，不显示主窗口。点击托盘图标可访问所有功能，节省系统资源。
                </div>
            </div>
            
            <div class="option-card" id="windowOption" onclick="selectOption('window')">
                <div class="option-header">
                    <span class="option-icon">🖥️</span>
                    <span class="option-title">主窗口模式</span>
                </div>
                <div class="option-desc">
                    应用启动后显示主控制台窗口，方便快速访问服务器状态、调试工具等功能。
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" id="confirmBtn" onclick="confirmSelection()" disabled>确认选择</button>
        </div>
        
        <div class="footer">
            <p>您可以在设置中随时更改默认启动模式</p>
        </div>
    </div>
    
    <script>
        let selectedMode = null;
        
        function selectOption(mode) {
            selectedMode = mode;
            
            // 更新UI
            document.getElementById('trayOption').classList.remove('selected');
            document.getElementById('windowOption').classList.remove('selected');
            
            if (mode === 'tray') {
                document.getElementById('trayOption').classList.add('selected');
            } else if (mode === 'window') {
                document.getElementById('windowOption').classList.add('selected');
            }
            
            // 启用确认按钮
            document.getElementById('confirmBtn').disabled = false;
        }
        
        function confirmSelection() {
            if (!selectedMode) return;
            
            // 通过Electron API发送选择结果到主进程
            if (window.electronAPI) {
                window.electronAPI.send('startup-wizard-complete', selectedMode);
            }
        }
        
        // 页面加载完成后自动聚焦到第一个选项
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('trayOption').focus();
        });
    </script>
</body>
</html>`;
}

module.exports = { generateStartupWizardHTML };