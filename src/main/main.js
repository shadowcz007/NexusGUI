const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initializeSSEMCPServer } = require('../mcp/sse/wrapper.js');

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

// __dirname 在 CommonJS 中已经可用

let mainWindow;
let sseServer;
let tray = null;
let mcpServerInfo = null;

// 统一 GUI 创建函数
async function createWindow(config = {}) {
    console.log('🔍 开始创建窗口...');

    // 检查是否复用现有窗口
    const reuseWindow = config.reuseWindow || false;

    if (reuseWindow) {
        // 尝试复用现有窗口
        const existingWindows = BrowserWindow.getAllWindows();
        if (existingWindows.length > 0) {
            console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，尝试复用...`);

            // 找到第一个可用的窗口
            for (const win of existingWindows) {
                if (!win.isDestroyed()) {
                    console.log(`✅ 复用现有窗口: ${win.getTitle()}`);

                    // 更新窗口配置
                    if (config.width && config.height) {
                        win.setSize(config.width, config.height);
                    }
                    if (config.title) {
                        win.setTitle(config.title);
                    }
                    if (config.alwaysOnTop !== undefined) {
                        win.setAlwaysOnTop(config.alwaysOnTop);
                    }
                    if (config.opacity !== undefined) {
                        win.setOpacity(config.opacity);
                    }
                    if (config.fullscreen !== undefined) {
                        win.setFullScreen(config.fullscreen);
                    }
                    if (config.zoomFactor !== undefined) {
                        win.webContents.setZoomFactor(config.zoomFactor);
                    }

                    // 重新加载内容
                    try {
                        if (config.html) {
                            console.log('📄 使用 HTML 模式重新渲染');
                            win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(config.html)}`);
                        } else {
                            await win.loadFile(path.join(__dirname, '../renderer/index.html'));
                            console.log('✅ HTML 文件重新加载成功');
                        }

                        // 等待页面加载完成后发送配置
                        win.webContents.once('did-finish-load', () => {
                            console.log('✅ 页面重新加载完成，发送配置到渲染进程');

                            if (!config.html) {
                                console.log('📊 使用组件模式重新渲染');
                                win.webContents.send('render-dynamic-gui', config);
                            }

                            // 确保窗口显示并聚焦
                            win.show();
                            win.focus();

                            // 将窗口移到前台（短暂置顶）
                            win.setAlwaysOnTop(true);
                            setTimeout(() => {
                                win.setAlwaysOnTop(config.alwaysOnTop);
                                // 再次确保窗口可见
                                win.show();
                                win.focus();
                            }, 200);

                            console.log('✅ 复用窗口已更新并显示');
                        });

                        return win;
                    } catch (error) {
                        console.error('❌ 复用窗口时加载内容失败:', error);
                        // 如果复用失败，继续创建新窗口
                    }
                }
            }
        }
    } else {
        // 检查并关闭现有窗口
        const existingWindows = BrowserWindow.getAllWindows();
        if (existingWindows.length > 0) {
            console.log(`🔍 发现 ${existingWindows.length} 个现有窗口，正在关闭...`);
            for (const win of existingWindows) {
                if (!win.isDestroyed()) {
                    win.close();
                }
            }
            // 等待窗口关闭
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // 窗口属性配置
    const windowConfig = {
        width: config.width || 800,
        height: config.height || 600,
        title: config.title || 'NexusGUI - 动态界面',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        titleBarStyle: config.showMenuBar === false ? 'hidden' : 'default',
        icon: path.join(__dirname, 'assets', 'icon.png'), // 可选图标
        // 确保窗口在屏幕中央显示
        center: true,
        // 设置最小尺寸
        minWidth: config.minWidth || 400,
        minHeight: config.minHeight || 300,
        // 设置最大尺寸
        maxWidth: config.maxWidth,
        maxHeight: config.maxHeight,
        // 窗口可见性设置
        alwaysOnTop: config.alwaysOnTop || false,
        skipTaskbar: config.skipTaskbar || false,
        // 确保窗口在任务栏显示
        showInTaskbar: config.showInTaskbar !== false,
        // 设置窗口位置（屏幕中央）
        x: config.x,
        y: config.y,
        // 窗口样式设置
        frame: config.frame !== false,
        titleBarStyle: config.titleBarStyle || 'default',
        // 窗口行为设置
        resizable: config.resizable !== false,
        movable: config.movable !== false,
        minimizable: config.minimizable !== false,
        maximizable: config.maximizable !== false,
        closable: config.closable !== false,
        // 透明度设置
        opacity: config.opacity,
        // 窗口类型设置
        type: config.windowType || 'normal',
        // 全屏设置
        fullscreen: config.fullscreen || false,
        // 缩放设置
        zoomFactor: config.zoomFactor
    };

    console.log('🔍 创建窗口:', config);
    console.log('📱 窗口配置:', windowConfig);

    const win = new BrowserWindow(windowConfig);

    console.log('🔍 创建窗口:', config);
    console.log('📱 窗口配置:', {
        width: config.width || 800,
        height: config.height || 600,
        title: config.title || 'NexusGUI - 动态界面'
    });


    try {

        if (config.html) {
            console.log('📄 使用 HTML 模式渲染');
            // 直接加载 HTML 内容到渲染窗口
            win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(config.html)}`);
            console.log('✅ HTML 内容已直接加载到渲染窗口');

        } else {
            await win.loadFile(path.join(__dirname, '../renderer/index.html'));
            console.log('✅ HTML 文件加载成功');
        }

    } catch (error) {
        console.error('❌ HTML 文件加载失败:', error);
        throw error;
    }

    // 添加超时机制，确保窗口一定会显示
    let isWindowShown = false;

    // 等待页面加载完成后发送配置
    win.webContents.once('did-finish-load', () => {
        console.log('✅ 页面加载完成，发送配置到渲染进程');

        if (!isWindowShown) {
            isWindowShown = true;

            console.log(`DEBUG: In createWindow, config.html type: ${typeof config.html}`);
            console.log(`DEBUG: In createWindow, config.html value:`, config.html ? config.html.substring(0, 50) + '...' : 'null/undefined/empty');
            // 检查是否使用 HTML 模式
            // HTML 模式：内容已通过 loadURL 直接加载
            if (!config.html) {
                console.warn('⚠️ 未提供 HTML 内容');
            }

            // 确保窗口显示并聚焦
            win.show();
            win.focus();

            // 将窗口移到前台（短暂置顶）
            win.setAlwaysOnTop(true);
            setTimeout(() => {
                win.setAlwaysOnTop(config.alwaysOnTop);
                // 再次确保窗口可见
                win.show();
                win.focus();
            }, 200);

            console.log('✅ 窗口已显示并聚焦');
        }
    });

    // 添加超时机制，如果页面加载超时，强制显示窗口
    setTimeout(() => {
        if (!isWindowShown) {
            console.log('⚠️ 页面加载超时，强制显示窗口');
            isWindowShown = true;

            // HTML 模式不需要发送配置到渲染进程

            // 强制显示窗口
            win.show();
            win.focus();
            win.setAlwaysOnTop(true);
            setTimeout(() => {
                win.setAlwaysOnTop(config.alwaysOnTop);
            }, 500);

            console.log('✅ 窗口已强制显示');
        }
    }, 3000); // 3秒超时

    // 调试页面加载失败
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('🔍 页面加载失败:', errorCode, errorDescription);
    });

    // 添加更多页面加载调试信息
    win.webContents.on('did-start-loading', () => {
        console.log('🔄 页面开始加载');
    });

    win.webContents.on('did-stop-loading', () => {
        console.log('⏹️ 页面停止加载');
    });

    win.webContents.on('dom-ready', () => {
        console.log('📄 DOM 已准备就绪');
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        win.webContents.openDevTools();
        console.log('🔧 开发者工具已打开');
    }

    // 监听窗口事件
    win.on('ready-to-show', () => {
        console.log('✅ 窗口准备显示');
    });

    win.on('show', () => {
        console.log('✅ 窗口已显示');
    });

    win.on('focus', () => {
        console.log('✅ 窗口已聚焦');
    });

    // 监听窗口关闭事件
    win.on('closed', () => {
        console.log('✅ 窗口已关闭');
    });

    return win;
}

// 暴露给全局，供 MCP 服务器调用
global.createWindow = async(config = {}) => {
    console.log('🌐 通过 MCP 调用创建窗口');

    return await createWindow(config);
};

// 创建系统托盘图标
function createTrayIcon() {
    // 创建托盘图标 (使用系统默认图标或自定义图标)
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    let trayIcon;
    
    try {
        // 尝试使用自定义图标
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            throw new Error('自定义图标为空');
        }
    } catch (error) {
        // 如果自定义图标不存在，使用系统默认图标
        console.log('使用系统默认托盘图标');
        trayIcon = nativeImage.createEmpty();
        // 在macOS上创建一个简单的模板图标
        if (process.platform === 'darwin') {
            trayIcon = nativeImage.createFromNamedImage('NSStatusAvailable', [16, 16]);
        }
    }
    
    tray = new Tray(trayIcon);
    
    // 设置托盘提示文本
    tray.setToolTip('NexusGUI - MCP 服务器控制台');
    
    // 创建托盘菜单
    updateTrayMenu();
    
    // 双击托盘图标显示主控制台
    tray.on('double-click', () => {
        showMCPConsole();
    });
    
    console.log('✅ 系统托盘已创建');
}

// 更新托盘菜单
function updateTrayMenu() {
    if (!tray) return;
    
    const serverStatus = mcpServerInfo?.status === 'running' ? '🟢 运行中' : '🔴 已停止';
    const serverPort = mcpServerInfo?.port || '未知';
    const activeSessions = getActiveSessionsCount();
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: `NexusGUI MCP 服务器`,
            type: 'normal',
            enabled: false
        },
        { type: 'separator' },
        {
            label: `状态: ${serverStatus}`,
            type: 'normal',
            enabled: false
        },
        {
            label: `端口: ${serverPort}`,
            type: 'normal',
            enabled: false
        },
        {
            label: `活动会话: ${activeSessions}`,
            type: 'normal',
            enabled: false
        },
        { type: 'separator' },
        {
            label: '📊 MCP 服务器控制台',
            type: 'normal',
            click: () => showMCPConsole()
        },
        {
            label: '🔧 调试信息窗口',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showDebugWindow()
        },
        {
            label: '🏥 健康检查',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showHealthCheck()
        },
        {
            label: '📋 会话管理',
            type: 'normal',
            enabled: mcpServerInfo?.status === 'running',
            click: () => showSessionManager()
        },
        { type: 'separator' },
        {
            label: '🔄 刷新状态',
            type: 'normal',
            click: () => refreshServerStatus()
        },
        {
            label: '⚙️ 服务器设置',
            type: 'normal',
            click: () => showServerSettings()
        },
        { type: 'separator' },
        {
            label: '🚪 退出',
            type: 'normal',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

// 获取活动会话数量
function getActiveSessionsCount() {
    // 这里需要从MCP服务器获取实际的会话数量
    // 暂时返回模拟数据
    return 0;
}

// 显示MCP服务器控制台
async function showMCPConsole() {
    try {
        const consoleWindow = await createWindow({
            title: 'NexusGUI - MCP 服务器控制台',
            width: 900,
            height: 700,
            html: generateMCPDashboardHTML(mcpServerInfo),
            alwaysOnTop: false,
            reuseWindow: true
        });
        
        console.log('✅ MCP 控制台窗口已显示');
    } catch (error) {
        console.error('❌ 显示MCP控制台失败:', error);
    }
}

// 显示调试信息窗口
async function showDebugWindow() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法显示调试信息');
        return;
    }
    
    const debugHtml = generateDebugWindowHTML();
    
    try {
        await createWindow({
            title: 'MCP 服务器 - 调试信息',
            width: 800,
            height: 600,
            html: debugHtml,
            alwaysOnTop: true
        });
        
        console.log('✅ 调试信息窗口已显示');
    } catch (error) {
        console.error('❌ 显示调试窗口失败:', error);
    }
}

// 显示健康检查窗口
async function showHealthCheck() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法进行健康检查');
        return;
    }
    
    try {
        // 直接打开健康检查URL
        const { shell } = require('electron');
        await shell.openExternal(`http://localhost:${mcpServerInfo.port}/health`);
        
        console.log('✅ 健康检查页面已在浏览器中打开');
    } catch (error) {
        console.error('❌ 打开健康检查页面失败:', error);
    }
}

// 显示会话管理窗口
async function showSessionManager() {
    if (!mcpServerInfo || mcpServerInfo.status !== 'running') {
        console.log('⚠️ MCP服务器未运行，无法显示会话管理');
        return;
    }
    
    const sessionHtml = generateSessionManagerHTML();
    
    try {
        await createWindow({
            title: 'MCP 服务器 - 会话管理',
            width: 700,
            height: 500,
            html: sessionHtml,
            alwaysOnTop: true
        });
        
        console.log('✅ 会话管理窗口已显示');
    } catch (error) {
        console.error('❌ 显示会话管理窗口失败:', error);
    }
}

// 刷新服务器状态
function refreshServerStatus() {
    console.log('🔄 刷新服务器状态...');
    
    // 更新托盘菜单
    updateTrayMenu();
    
    // 如果主控制台窗口打开，刷新它
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
        if (window.getTitle().includes('MCP 服务器控制台')) {
            window.reload();
        }
    });
    
    console.log('✅ 服务器状态已刷新');
}

// 显示服务器设置窗口
async function showServerSettings() {
    const settingsHtml = generateServerSettingsHTML();
    
    try {
        await createWindow({
            title: 'MCP 服务器 - 设置',
            width: 600,
            height: 400,
            html: settingsHtml,
            alwaysOnTop: true
        });
        
        console.log('✅ 服务器设置窗口已显示');
    } catch (error) {
        console.error('❌ 显示设置窗口失败:', error);
    }
}

app.whenReady().then(async() => {
    mcpServerInfo = {
        status: 'failed',
        port: 3000,
        endpoints: [],
        error: null,
        startTime: new Date().toISOString()
    };

    // 初始化 SSE MCP 服务器
    try {
        const { sseServer: createSSEServer } = await initializeSSEMCPServer();
        sseServer = createSSEServer(3000);
        
        mcpServerInfo = {
            status: 'running',
            port: 3000,
            endpoints: [
                { name: 'SSE 连接', path: '/mcp', description: '建立 Server-Sent Events 连接' },
                { name: '消息处理', path: '/messages', description: '处理 JSON-RPC 消息' },
                { name: '健康检查', path: '/health', description: '服务器状态检查' },
                { name: '调试信息', path: '/debug/sessions', description: '查看活动会话' }
            ],
            error: null,
            startTime: new Date().toISOString(),
            serverName: 'nexusgui-sse-server',
            version: '0.1.0'
        };
        
        console.log('✅ SSE MCP 服务器已启动');
    } catch (error) {
        console.error('❌ SSE MCP 服务器启动失败:', error);
        mcpServerInfo.error = error.message;
    }

    // 创建系统托盘
    createTrayIcon();

    // 创建主窗口并显示MCP服务器信息（可选，也可以只通过托盘访问）
    if (process.argv.includes('--show-main-window')) {
        mainWindow = await createWindow({
            title: 'NexusGUI - MCP 服务器控制台',
            html: generateMCPDashboardHTML(mcpServerInfo)
        });
    }

    app.on('activate', async() => {
        // 在macOS上，点击dock图标时显示主控制台
        if (process.platform === 'darwin') {
            showMCPConsole();
        }
    });
});

app.on('window-all-closed', () => {
    // 有托盘图标时，关闭所有窗口不退出应用
    if (tray) {
        console.log('✅ 所有窗口已关闭，应用继续在托盘中运行');
        return;
    }
    
    if (process.platform !== 'darwin') {
        // 关闭 SSE MCP 服务器
        if (sseServer) {
            sseServer.close();
        }
        app.quit();
    }
});

app.on('before-quit', () => {
    // 应用退出前清理托盘
    if (tray) {
        tray.destroy();
        tray = null;
    }
    
    // 关闭 SSE MCP 服务器
    if (sseServer) {
        sseServer.close();
    }
    
    console.log('✅ 应用正在退出，资源已清理');
});

// IPC 处理程序
ipcMain.handle('mcp-result', async(event, result) => {
    console.log('📤 收到来自渲染进程的结果:', result);
    // 这里可以将结果发送回 MCP 客户端
    return { success: true };
});

// 处理开发者工具打开请求
ipcMain.on('open-dev-tools', (event) => {
    const webContents = event.sender;
    webContents.openDevTools();
    console.log('🔧 开发者工具已打开');
});

// 添加窗口状态检查
ipcMain.handle('check-window-status', async() => {
    const windows = BrowserWindow.getAllWindows();
    return {
        windowCount: windows.length,
        windows: windows.map(win => ({
            id: win.id,
            title: win.getTitle(),
            isVisible: win.isVisible(),
            isDestroyed: win.isDestroyed(),
            bounds: win.getBounds()
        }))
    };
});

ipcMain.handle('get-form-data', async(event, formSelector) => {
    // 获取表单数据的辅助方法
    return new Promise((resolve) => {
        event.sender.executeJavaScript(`
      (() => {
        const form = document.querySelector('${formSelector}') || document.body;
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
          data[key] = value;
        }
        return data;
      })()
    `).then(resolve);
    });
});

// 命令行参数处理（支持 -gui 参数）
(async() => {
    if (process.argv.includes('-gui')) {
        const guiIndex = process.argv.indexOf('-gui');
        const guiName = process.argv[guiIndex + 1];

        if (guiName) {
            // 尝试加载本地 GUI 定义文件
            const guiPath = path.join(__dirname, 'guis', `${guiName}.json`);
            try {
                const { readFileSync } = await
                import ('fs');
                const guiConfig = JSON.parse(readFileSync(guiPath, 'utf8'));
                app.whenReady().then(() => {
                    createWindow(guiConfig);
                });
            } catch (error) {
                console.error(`❌ 无法加载 GUI 定义: ${guiName}`, error);
            }
        }
    }
})();

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

// 生成服务器设置窗口HTML
function generateServerSettingsHTML() {
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
        input[type="number"], input[type="text"] {
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.9rem;
            width: 100px;
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
        }
        .actions {
            text-align: center;
            margin-top: 30px;
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
                    <input type="number" value="${mcpServerInfo?.port || 3000}" min="1000" max="65535">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用CORS</span>
                <div class="setting-control">
                    <div class="toggle active" onclick="toggleSetting(this)"></div>
                </div>
            </div>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">日志设置</div>
            <div class="setting-item">
                <span class="setting-label">启用详细日志</span>
                <div class="setting-control">
                    <div class="toggle active" onclick="toggleSetting(this)"></div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">日志级别</span>
                <div class="setting-control">
                    <select style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="setting-group">
            <div class="setting-title">性能设置</div>
            <div class="setting-item">
                <span class="setting-label">最大并发连接</span>
                <div class="setting-control">
                    <input type="number" value="100" min="1" max="1000">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">会话超时(秒)</span>
                <div class="setting-control">
                    <input type="number" value="300" min="60" max="3600">
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="saveSettings()">💾 保存设置</button>
            <button class="btn btn-secondary" onclick="resetSettings()">🔄 重置默认</button>
        </div>
    </div>
    
    <script>
        function toggleSetting(element) {
            element.classList.toggle('active');
        }
        
        function saveSettings() {
            alert('设置已保存！');
            // 这里可以实现实际的设置保存逻辑
        }
        
        function resetSettings() {
            if (confirm('确定要重置为默认设置吗？')) {
                location.reload();
            }
        }
    </script>
</body>
</html>`;
}

console.log('🚀 NexusGUI 主进程已启动');