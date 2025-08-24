# NexusGUI MCP 服务器扩展计划

## 目标
引入 `mcp_exe` 包实现可配置的 MCP 服务器管理，支持工具链式调用、多 MCP 服务组合、插件化工具系统等高级功能。

## 当前状态分析

### 已实现的 MCP 功能
- ✅ 基于 `@modelcontextprotocol/sdk` 的 MCP 服务器实现
- ✅ SSE 和 stdio 两种传输方式
- ✅ 自定义 `render-gui` 工具
- ✅ 工具注册和管理系统

### 发现的目标包：mcp_exe
通过查询发现 [mcp_exe](https://www.npmjs.com/package/mcp_exe) 包，这是一个功能强大的 MCP 服务器启动器，提供：

#### 核心功能
- **工具链式调用**: 支持将多个工具按序组合，实现复杂的自动化流程
- **多 MCP 服务组合**: 可同时运行和管理多个 MCP 服务，支持 SSE 和 stdio 双模式
- **插件化工具系统**: 支持自定义工具的动态加载和配置
- **灵活的部署选项**: 从单机运行到分布式部署，满足各类集成场景
- **自动重载**: 监听配置文件变更，自动重启生效

#### 主要使用场景
1. **WebSocket 连接模式**: 连接到 xiaozhi.me 等 WebSocket 服务
2. **快速启动独立服务**: 双击运行或 npx 启动标准 MCP 服务
3. **组合多个 MCP 服务**: 使用与 Cursor 一致的 mcp.json 配置文件
4. **工具链式调用**: 支持复杂的自动化流程
5. **自定义工具插件**: 通过 JavaScript 配置文件定义工具
6. **定时任务模式**: 支持定时执行工具
7. **嵌入式集成**: 作为独立进程集成到应用程序中

## 实现方案

### 1. 集成 mcp_exe 作为核心引擎

#### 安装和基础配置
```bash
npm install mcp_exe
```

#### 基础集成代码
```javascript
const { McpRouterServer } = require('mcp_exe');

class NexusMCPServer {
    constructor() {
        this.mcpServer = new McpRouterServer(
            { 
                name: 'nexusgui-mcp-server',
                version: '1.0.0',
                description: 'NexusGUI MCP 服务器'
            }, 
            { 
                transportType: 'sse', 
                port: 3001 
            }
        );
    }
    
    async start() {
        // 导入 MCP 配置
        await this.mcpServer.importMcpConfig(require('./mcp.json'), null);
        await this.mcpServer.start();
    }
}
```

### 2. 配置文件设计

#### 主配置文件 (mcp.json)
```json
{
    "mcpServers": {
        "nexusgui-core": {
            "url": "http://127.0.0.1:3000"
        },
        "filesystem-server": {
            "command": "npx",
            "args": ["@modelcontextprotocol/server-filesystem", "--transport", "stdio"]
        },
        "playwright-server": {
            "command": "npx", 
            "args": ["@playwright/mcp", "--transport", "stdio"]
        }
    },
    "serverInfo": {
        "serverName": "nexusgui-mcp-server",
        "version": "1.0.0",
        "description": "NexusGUI 增强 MCP 服务器",
        "author": "shadow"
    },
    "tools": [],
    "namespace": ".",
    "toolChains": [
        {
            "name": "create_gui_with_data",
            "description": "创建带数据的 GUI 界面",
            "steps": [
                { "toolName": "read_file", "args": {}, "outputMapping": { "fileContent": "content.0.text" } },
                { "toolName": "render-gui", "args": {}, "outputMapping": { "html": "content.0.text" }, "fromStep": 0 }
            ],
            "output": { "steps": [1] }
        }
    ]
}
```

#### 自定义工具配置 (custom-mcp-config.js)
```javascript
module.exports = {
    configureMcp: function(server, ResourceTemplate, z) {
        // 注册 NexusGUI 特有的工具
        server.tool(
            'nexusgui_render', 
            '渲染 NexusGUI 界面', 
            {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    width: { type: 'number' },
                    height: { type: 'number' }
                },
                required: ['title', 'content']
            }, 
            async (args) => {
                // 调用现有的 render-gui 功能
                return { content: [{ type: 'text', text: 'GUI 渲染成功' }] };
            }
        );
        
        // 注册资源模板
        server.resource(
            'nexusgui-template', 
            new ResourceTemplate('nexusgui://{template}', { list: undefined }), 
            async (uri, { template }) => {
                return { 
                    contents: [{ 
                        uri: uri.href, 
                        text: `NexusGUI 模板: ${template}` 
                    }] 
                };
            }
        );
    }
};
```

### 3. 工具链式调用集成

#### 预定义工具链
```json
{
    "toolChains": [
        {
            "name": "web_automation_gui",
            "description": "网页自动化并生成 GUI 报告",
            "steps": [
                { "toolName": "browser_navigate", "args": {} },
                { "toolName": "browser_screenshot", "args": {} },
                { "toolName": "nexusgui_render", "args": {}, "outputMapping": { "screenshot": "content.0.text" }, "fromStep": 1 }
            ],
            "output": { "steps": [2] }
        },
        {
            "name": "file_analysis_gui",
            "description": "文件分析并生成可视化界面",
            "steps": [
                { "toolName": "read_file", "args": {} },
                { "toolName": "analyze_content", "args": {}, "outputMapping": { "analysis": "content.0.text" }, "fromStep": 0 },
                { "toolName": "nexusgui_render", "args": {}, "outputMapping": { "report": "content.0.text" }, "fromStep": 1 }
            ],
            "output": { "steps": [2] }
        }
    ]
}
```

### 4. 定时任务集成

#### 定时任务配置 (cronjob.json)
```json
{
    "tasks": [
        {
            "schedule": "0 */6 * * *",
            "operations": [
                { "type": "callTool", "name": "system_monitor", "arguments": {} }
            ],
            "notify": [
                { 
                    "type": "desktop", 
                    "title": "系统监控报告", 
                    "icon": "assets/icon.png" 
                }
            ]
        },
        {
            "schedule": "0 9 * * *",
            "operations": [
                { "type": "callTool", "name": "daily_report_gui", "arguments": {} }
            ],
            "notify": [
                { 
                    "type": "email", 
                    "to": "admin@example.com",
                    "subject": "每日报告已生成"
                }
            ]
        }
    ]
}
```

### 5. 用户界面集成

#### 服务器管理面板
```javascript
class MCPServerManagementPanel {
    render() {
        return `
            <div class="mcp-server-management">
                <h3>MCP 服务器管理</h3>
                
                <div class="server-status">
                    <h4>服务器状态</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="label">主服务器:</span>
                            <span class="value status-running">运行中</span>
                        </div>
                        <div class="status-item">
                            <span class="label">端口:</span>
                            <span class="value">3001</span>
                        </div>
                    </div>
                </div>
                
                <div class="tool-chains">
                    <h4>工具链</h4>
                    <div class="chain-list">
                        <div class="chain-item">
                            <span class="name">web_automation_gui</span>
                            <span class="description">网页自动化并生成 GUI 报告</span>
                            <button class="run-btn">运行</button>
                        </div>
                        <div class="chain-item">
                            <span class="name">file_analysis_gui</span>
                            <span class="description">文件分析并生成可视化界面</span>
                            <button class="run-btn">运行</button>
                        </div>
                    </div>
                </div>
                
                <div class="scheduled-tasks">
                    <h4>定时任务</h4>
                    <div class="task-list">
                        <div class="task-item">
                            <span class="schedule">每6小时</span>
                            <span class="operation">系统监控</span>
                            <span class="status">活跃</span>
                        </div>
                        <div class="task-item">
                            <span class="schedule">每日 9:00</span>
                            <span class="operation">每日报告</span>
                            <span class="status">活跃</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
```

### 6. 实现步骤

#### 阶段 1: 基础集成 (1 周)

##### 1.1 安装和依赖配置 (1 天)
1. **安装 mcp_exe 包**
   ```bash
   npm install mcp_exe
   ```

2. **更新 package.json 依赖**
   ```json
   {
     "dependencies": {
       "mcp_exe": "^0.12.0"
     }
   }
   ```

3. **创建基础目录结构**
   ```
   src/mcp/mcp_exe/
   ├── server.js
   ├── config/
   │   ├── default-mcp.json
   │   └── user-mcp.json
   ├── ui/
   │   ├── ConfigInputPanel.js
   │   └── ServerStatusPanel.js
   └── integration/
       └── McpExeBridge.js
   ```

##### 1.2 配置文件管理系统 (2 天)

###### 1.2.1 用户配置存储
```javascript
// src/mcp/mcp_exe/integration/ConfigManager.js
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class MCPConfigManager {
    constructor() {
        this.userConfigPath = path.join(app.getPath('userData'), 'mcp-config.json');
        this.defaultConfigPath = path.join(__dirname, '../config/default-mcp.json');
    }
    
    // 获取用户配置
    getUserConfig() {
        try {
            if (fs.existsSync(this.userConfigPath)) {
                const config = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
                return config;
            }
        } catch (error) {
            console.error('读取用户配置失败:', error);
        }
        return this.getDefaultConfig();
    }
    
    // 保存用户配置
    saveUserConfig(config) {
        try {
            // 验证配置格式
            this.validateConfig(config);
            
            // 保存到用户数据目录
            fs.writeFileSync(this.userConfigPath, JSON.stringify(config, null, 2));
            
            // 通知配置变更
            this.notifyConfigChange(config);
            
            return true;
        } catch (error) {
            console.error('保存用户配置失败:', error);
            throw error;
        }
    }
    
    // 获取默认配置
    getDefaultConfig() {
        try {
            return JSON.parse(fs.readFileSync(this.defaultConfigPath, 'utf8'));
        } catch (error) {
            console.error('读取默认配置失败:', error);
            return this.getMinimalConfig();
        }
    }
    
    // 最小配置模板
    getMinimalConfig() {
        return {
            "mcpServers": {
                "nexusgui-core": {
                    "url": "http://127.0.0.1:3000"
                }
            },
            "serverInfo": {
                "serverName": "nexusgui-mcp-server",
                "version": "1.0.0",
                "description": "NexusGUI MCP 服务器",
                "author": "shadow"
            },
            "tools": [],
            "namespace": ".",
            "toolChains": []
        };
    }
    
    // 验证配置格式
    validateConfig(config) {
        const requiredFields = ['mcpServers', 'serverInfo'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`配置缺少必需字段: ${field}`);
            }
        }
        
        if (!config.serverInfo.serverName) {
            throw new Error('serverInfo 中缺少 serverName 字段');
        }
    }
    
    // 通知配置变更
    notifyConfigChange(config) {
        // 通过 IPC 通知主进程配置已更新
        if (global.mainWindow) {
            global.mainWindow.webContents.send('mcp-config-updated', {
                success: true,
                config: config
            });
        }
    }
}

module.exports = MCPConfigManager;
```

###### 1.2.2 配置输入界面
```javascript
// src/mcp/mcp_exe/ui/ConfigInputPanel.js
class MCPConfigInputPanel {
    constructor() {
        this.configManager = new MCPConfigManager();
    }
    
    render() {
        const currentConfig = this.configManager.getUserConfig();
        
        return `
            <div class="mcp-config-panel">
                <h3>MCP 服务器配置</h3>
                
                <div class="config-section">
                    <h4>配置文件 (JSON 格式)</h4>
                    <div class="config-input-container">
                        <textarea 
                            id="mcp-config-input" 
                            class="config-textarea"
                            placeholder="请粘贴或输入 MCP 配置文件 (JSON 格式)..."
                            rows="20"
                        >${JSON.stringify(currentConfig, null, 2)}</textarea>
                    </div>
                    
                    <div class="config-actions">
                        <button id="validate-config-btn" class="btn btn-secondary">
                            <i class="icon-check"></i> 验证配置
                        </button>
                        <button id="save-config-btn" class="btn btn-primary">
                            <i class="icon-save"></i> 保存配置
                        </button>
                        <button id="reset-config-btn" class="btn btn-warning">
                            <i class="icon-refresh"></i> 重置为默认
                        </button>
                        <button id="load-example-btn" class="btn btn-info">
                            <i class="icon-file"></i> 加载示例
                        </button>
                    </div>
                </div>
                
                <div class="config-status">
                    <div id="config-status-message" class="status-message"></div>
                </div>
                
                <div class="config-help">
                    <h4>配置说明</h4>
                    <ul>
                        <li><strong>mcpServers</strong>: 定义要组合的 MCP 服务器</li>
                        <li><strong>serverInfo</strong>: 服务器基本信息</li>
                        <li><strong>tools</strong>: 工具白名单 (空数组表示不过滤)</li>
                        <li><strong>namespace</strong>: 命名空间分隔符</li>
                        <li><strong>toolChains</strong>: 工具链定义</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const configInput = document.getElementById('mcp-config-input');
        const validateBtn = document.getElementById('validate-config-btn');
        const saveBtn = document.getElementById('save-config-btn');
        const resetBtn = document.getElementById('reset-config-btn');
        const loadExampleBtn = document.getElementById('load-example-btn');
        const statusMessage = document.getElementById('config-status-message');
        
        // 验证配置
        validateBtn.addEventListener('click', () => {
            try {
                const configText = configInput.value;
                const config = JSON.parse(configText);
                this.configManager.validateConfig(config);
                
                this.showStatus('配置格式正确', 'success');
            } catch (error) {
                this.showStatus(`配置验证失败: ${error.message}`, 'error');
            }
        });
        
        // 保存配置
        saveBtn.addEventListener('click', async () => {
            try {
                const configText = configInput.value;
                const config = JSON.parse(configText);
                
                await this.configManager.saveUserConfig(config);
                this.showStatus('配置保存成功', 'success');
                
                // 通知主进程重启 MCP 服务器
                this.restartMCPServer();
            } catch (error) {
                this.showStatus(`保存失败: ${error.message}`, 'error');
            }
        });
        
        // 重置配置
        resetBtn.addEventListener('click', () => {
            const defaultConfig = this.configManager.getDefaultConfig();
            configInput.value = JSON.stringify(defaultConfig, null, 2);
            this.showStatus('已重置为默认配置', 'info');
        });
        
        // 加载示例配置
        loadExampleBtn.addEventListener('click', () => {
            const exampleConfig = this.getExampleConfig();
            configInput.value = JSON.stringify(exampleConfig, null, 2);
            this.showStatus('已加载示例配置', 'info');
        });
    }
    
    showStatus(message, type) {
        const statusMessage = document.getElementById('config-status-message');
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
        
        // 3秒后自动清除
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }, 3000);
    }
    
    getExampleConfig() {
        return {
            "mcpServers": {
                "nexusgui-core": {
                    "url": "http://127.0.0.1:3000"
                },
                "filesystem-server": {
                    "command": "npx",
                    "args": ["@modelcontextprotocol/server-filesystem", "--transport", "stdio"]
                },
                "playwright-server": {
                    "command": "npx",
                    "args": ["@playwright/mcp", "--transport", "stdio"]
                }
            },
            "serverInfo": {
                "serverName": "nexusgui-mcp-server",
                "version": "1.0.0",
                "description": "NexusGUI 增强 MCP 服务器",
                "author": "shadow"
            },
            "tools": [],
            "namespace": ".",
            "toolChains": [
                {
                    "name": "create_gui_with_data",
                    "description": "创建带数据的 GUI 界面",
                    "steps": [
                        { "toolName": "read_file", "args": {}, "outputMapping": { "fileContent": "content.0.text" } },
                        { "toolName": "render-gui", "args": {}, "outputMapping": { "html": "content.0.text" }, "fromStep": 0 }
                    ],
                    "output": { "steps": [1] }
                }
            ]
        };
    }
    
    async restartMCPServer() {
        // 通过 IPC 通知主进程重启 MCP 服务器
        if (window.electronAPI) {
            await window.electronAPI.restartMCPServer();
        }
    }
}

module.exports = MCPConfigInputPanel;
```

##### 1.3 MCP 服务器集成 (2 天)

###### 1.3.1 服务器桥接器
```javascript
// src/mcp/mcp_exe/integration/McpExeBridge.js
const { McpRouterServer } = require('mcp_exe');
const MCPConfigManager = require('./ConfigManager');

class McpExeBridge {
    constructor() {
        this.configManager = new MCPConfigManager();
        this.mcpServer = null;
        this.isRunning = false;
        this.port = 3001;
    }
    
    async initialize() {
        try {
            // 创建 MCP 服务器实例
            this.mcpServer = new McpRouterServer(
                { 
                    name: 'nexusgui-mcp-server',
                    version: '1.0.0',
                    description: 'NexusGUI MCP 服务器'
                }, 
                { 
                    transportType: 'sse', 
                    port: this.port 
                }
            );
            
            console.log('MCP 服务器实例创建成功');
            return true;
        } catch (error) {
            console.error('MCP 服务器初始化失败:', error);
            throw error;
        }
    }
    
    async start() {
        if (this.isRunning) {
            console.log('MCP 服务器已在运行中');
            return true;
        }
        
        try {
            // 获取用户配置
            const config = this.configManager.getUserConfig();
            
            // 导入配置
            await this.mcpServer.importMcpConfig(config, null);
            
            // 启动服务器
            await this.mcpServer.start();
            
            this.isRunning = true;
            console.log(`MCP 服务器已启动，端口: ${this.port}`);
            
            // 通知状态变更
            this.notifyStatusChange('running');
            
            return true;
        } catch (error) {
            console.error('MCP 服务器启动失败:', error);
            this.notifyStatusChange('error', error.message);
            throw error;
        }
    }
    
    async stop() {
        if (!this.isRunning || !this.mcpServer) {
            return true;
        }
        
        try {
            await this.mcpServer.close();
            this.isRunning = false;
            console.log('MCP 服务器已停止');
            
            this.notifyStatusChange('stopped');
            return true;
        } catch (error) {
            console.error('MCP 服务器停止失败:', error);
            throw error;
        }
    }
    
    async restart() {
        console.log('重启 MCP 服务器...');
        await this.stop();
        await this.start();
    }
    
    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            config: this.configManager.getUserConfig()
        };
    }
    
    notifyStatusChange(status, error = null) {
        if (global.mainWindow) {
            global.mainWindow.webContents.send('mcp-server-status', {
                status: status,
                error: error,
                port: this.port
            });
        }
    }
}

module.exports = McpExeBridge;
```

###### 1.3.2 主进程集成
```javascript
// src/mcp/mcp_exe/server.js
const McpExeBridge = require('./integration/McpExeBridge');

class MCPServerManager {
    constructor() {
        this.bridge = new McpExeBridge();
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            await this.bridge.initialize();
            this.initialized = true;
            console.log('MCP 服务器管理器初始化成功');
        } catch (error) {
            console.error('MCP 服务器管理器初始化失败:', error);
            throw error;
        }
    }
    
    async start() {
        await this.initialize();
        return await this.bridge.start();
    }
    
    async stop() {
        return await this.bridge.stop();
    }
    
    async restart() {
        return await this.bridge.restart();
    }
    
    getStatus() {
        return this.bridge.getStatus();
    }
}

// 创建全局实例
const mcpServerManager = new MCPServerManager();

// 暴露给主进程
global.mcpServerManager = mcpServerManager;

module.exports = mcpServerManager;
```

##### 1.4 用户界面集成 (1 天)

###### 1.4.1 服务器状态面板
```javascript
// src/mcp/mcp_exe/ui/ServerStatusPanel.js
class MCPServerStatusPanel {
    constructor() {
        this.status = 'stopped';
        this.port = 3001;
    }
    
    render() {
        return `
            <div class="mcp-server-status-panel">
                <h3>MCP 服务器状态</h3>
                
                <div class="status-grid">
                    <div class="status-item">
                        <span class="label">状态:</span>
                        <span class="value status-${this.status}">
                            ${this.getStatusText()}
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="label">端口:</span>
                        <span class="value">${this.port}</span>
                    </div>
                    <div class="status-item">
                        <span class="label">连接地址:</span>
                        <span class="value">http://localhost:${this.port}</span>
                    </div>
                </div>
                
                <div class="server-actions">
                    <button id="start-server-btn" class="btn btn-success" ${this.status === 'running' ? 'disabled' : ''}>
                        <i class="icon-play"></i> 启动服务器
                    </button>
                    <button id="stop-server-btn" class="btn btn-danger" ${this.status === 'stopped' ? 'disabled' : ''}>
                        <i class="icon-stop"></i> 停止服务器
                    </button>
                    <button id="restart-server-btn" class="btn btn-warning">
                        <i class="icon-refresh"></i> 重启服务器
                    </button>
                </div>
                
                <div class="status-message" id="server-status-message"></div>
            </div>
        `;
    }
    
    getStatusText() {
        const statusMap = {
            'running': '运行中',
            'stopped': '已停止',
            'error': '错误',
            'starting': '启动中',
            'stopping': '停止中'
        };
        return statusMap[this.status] || '未知';
    }
    
    attachEventListeners() {
        const startBtn = document.getElementById('start-server-btn');
        const stopBtn = document.getElementById('stop-server-btn');
        const restartBtn = document.getElementById('restart-server-btn');
        
        startBtn.addEventListener('click', async () => {
            await this.startServer();
        });
        
        stopBtn.addEventListener('click', async () => {
            await this.stopServer();
        });
        
        restartBtn.addEventListener('click', async () => {
            await this.restartServer();
        });
    }
    
    async startServer() {
        try {
            this.updateStatus('starting');
            await window.electronAPI.startMCPServer();
            this.updateStatus('running');
            this.showMessage('服务器启动成功', 'success');
        } catch (error) {
            this.updateStatus('error');
            this.showMessage(`启动失败: ${error.message}`, 'error');
        }
    }
    
    async stopServer() {
        try {
            this.updateStatus('stopping');
            await window.electronAPI.stopMCPServer();
            this.updateStatus('stopped');
            this.showMessage('服务器已停止', 'info');
        } catch (error) {
            this.showMessage(`停止失败: ${error.message}`, 'error');
        }
    }
    
    async restartServer() {
        try {
            await window.electronAPI.restartMCPServer();
            this.showMessage('服务器重启成功', 'success');
        } catch (error) {
            this.showMessage(`重启失败: ${error.message}`, 'error');
        }
    }
    
    updateStatus(status) {
        this.status = status;
        this.updateUI();
    }
    
    updateUI() {
        const statusElement = document.querySelector('.status-running, .status-stopped, .status-error, .status-starting, .status-stopping');
        if (statusElement) {
            statusElement.className = `value status-${this.status}`;
            statusElement.textContent = this.getStatusText();
        }
        
        // 更新按钮状态
        const startBtn = document.getElementById('start-server-btn');
        const stopBtn = document.getElementById('stop-server-btn');
        
        if (startBtn) startBtn.disabled = this.status === 'running';
        if (stopBtn) stopBtn.disabled = this.status === 'stopped';
    }
    
    showMessage(message, type) {
        const messageElement = document.getElementById('server-status-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `status-message status-${type}`;
            
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'status-message';
            }, 3000);
        }
    }
}

module.exports = MCPServerStatusPanel;
```

##### 1.5 IPC 通信集成 (1 天)

###### 1.5.1 主进程 IPC 处理器
```javascript
// 在 src/main/main.js 中添加
const { ipcMain } = require('electron');
const mcpServerManager = require('../mcp/mcp_exe/server');

// MCP 服务器相关 IPC 处理
ipcMain.handle('start-mcp-server', async () => {
    try {
        await mcpServerManager.start();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-mcp-server', async () => {
    try {
        await mcpServerManager.stop();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('restart-mcp-server', async () => {
    try {
        await mcpServerManager.restart();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-mcp-server-status', async () => {
    return mcpServerManager.getStatus();
});

ipcMain.handle('save-mcp-config', async (event, config) => {
    try {
        const configManager = require('../mcp/mcp_exe/integration/ConfigManager');
        const manager = new configManager();
        manager.saveUserConfig(config);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

###### 1.5.2 渲染进程 API
```javascript
// 在 src/main/preload.js 中添加
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // MCP 服务器控制
    startMCPServer: () => ipcRenderer.invoke('start-mcp-server'),
    stopMCPServer: () => ipcRenderer.invoke('stop-mcp-server'),
    restartMCPServer: () => ipcRenderer.invoke('restart-mcp-server'),
    getMCPServerStatus: () => ipcRenderer.invoke('get-mcp-server-status'),
    saveMCPConfig: (config) => ipcRenderer.invoke('save-mcp-config', config),
    
    // 事件监听
    onMCPServerStatus: (callback) => {
        ipcRenderer.on('mcp-server-status', (event, data) => callback(data));
    },
    onMCPConfigUpdated: (callback) => {
        ipcRenderer.on('mcp-config-updated', (event, data) => callback(data));
    }
});
```

##### 1.6 样式和界面优化 (1 天)

###### 1.6.1 CSS 样式
```css
/* src/mcp/mcp_exe/ui/styles.css */
.mcp-config-panel {
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 20px 0;
}

.config-textarea {
    width: 100%;
    min-height: 400px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.4;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    resize: vertical;
}

.config-actions {
    margin-top: 15px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.status-message {
    margin-top: 10px;
    padding: 10px;
    border-radius: 4px;
    font-weight: 500;
}

.status-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.status-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.mcp-server-status-panel {
    padding: 20px;
    background: #fff;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin: 20px 0;
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 15px 0;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.status-running {
    color: #28a745;
    font-weight: bold;
}

.status-stopped {
    color: #6c757d;
}

.status-error {
    color: #dc3545;
    font-weight: bold;
}

.server-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-success {
    background: #28a745;
    color: white;
}

.btn-danger {
    background: #dc3545;
    color: white;
}

.btn-warning {
    background: #ffc107;
    color: #212529;
}

.btn-info {
    background: #17a2b8;
    color: white;
}
```

##### 1.7 测试和验证 (1 天)

###### 1.7.1 功能测试清单
- [ ] 配置文件输入和验证
- [ ] 配置文件保存到用户数据目录
- [ ] 默认配置加载
- [ ] 示例配置加载
- [ ] MCP 服务器启动/停止/重启
- [ ] 服务器状态显示
- [ ] 配置变更后自动重启
- [ ] 错误处理和用户提示

###### 1.7.2 集成测试
```javascript
// 测试脚本
async function testMCPIntegration() {
    console.log('开始 MCP 集成测试...');
    
    // 测试配置管理
    const configManager = new MCPConfigManager();
    const config = configManager.getUserConfig();
    console.log('配置加载成功:', !!config);
    
    // 测试服务器启动
    const bridge = new McpExeBridge();
    await bridge.initialize();
    console.log('服务器初始化成功');
    
    // 测试配置保存
    const testConfig = {
        mcpServers: { test: { url: "http://test" } },
        serverInfo: { serverName: "test" }
    };
    configManager.saveUserConfig(testConfig);
    console.log('配置保存成功');
    
    console.log('MCP 集成测试完成');
}
```

##### 1.8 文档和说明 (0.5 天)

###### 1.8.1 用户使用说明
- 配置文件格式说明
- 常用配置示例
- 故障排除指南

###### 1.8.2 开发者文档
- API 接口说明
- 扩展开发指南
- 配置管理机制说明