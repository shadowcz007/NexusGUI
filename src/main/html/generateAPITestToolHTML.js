/**
 * HTML 编码函数，防止 XSS 攻击
 * @param {string} str - 需要编码的字符串
 * @returns {string} 编码后的字符串
 */
function escapeHtml(str) {
    if (typeof str !== 'string') {
        return String(str || '');
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 生成安全的 CSS ID
 * @param {string} str - 原始字符串
 * @returns {string} 安全的 CSS ID
 */
function sanitizeId(str) {
    if (typeof str !== 'string') {
        return 'unknown';
    }
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * 生成 API 测试工具 HTML
 * @param {Array} tools - 工具列表
 * @returns {string} HTML 内容
 */
function generateAPITestToolHTML(tools = []) {
    // 检查工具列表状态
    const hasTools = Array.isArray(tools) && tools.length > 0;
    const statusMessage = hasTools
        ? `已加载 ${tools.length} 个工具`
        : '工具注册器未初始化或没有可用工具';

    // 生成工具选择选项
    const toolOptions = hasTools ? tools.map(tool => {
        try {
            const name = escapeHtml(tool.name || 'unknown');
            const description = escapeHtml(tool.description || '无描述');
            const firstLine = description.split('\n')[0];
            const rawName = tool.name || 'unknown';
            return `<option value="${escapeHtml(rawName)}">${name} - ${firstLine}</option>`;
        } catch (error) {
            console.error('生成工具选项时出错:', error, tool);
            return `<option value="error">错误的工具配置</option>`;
        }
    }).join('') : '<option value="">没有可用的工具</option>';

    // 生成工具详细信息
    const toolDetails = hasTools ? tools.map(tool => {
        try {
            const rawName = tool.name || 'unknown';
            const name = escapeHtml(rawName);
            const description = escapeHtml(tool.description || '无描述');
            const inputSchema = tool.inputSchema || {};
            const safeId = sanitizeId(rawName);

            // 安全地处理 JSON 序列化
            let schemaJson;
            try {
                schemaJson = escapeHtml(JSON.stringify(inputSchema, null, 2));
            } catch (jsonError) {
                console.error('JSON 序列化失败:', jsonError);
                schemaJson = escapeHtml('无法序列化 Schema');
            }

            return `
        <div class="tool-detail" id="tool-detail-${safeId}" style="display: none;">
            <h3>${name}</h3>
            <p>${description.replace(/\n/g, '<br>')}</p>
            <h4>参数 Schema:</h4>
            <pre class="schema">${schemaJson}</pre>
        </div>
    `;
        } catch (error) {
            console.error('生成工具详情时出错:', error, tool);
            return `
        <div class="tool-detail" id="tool-detail-error" style="display: none;">
            <h3>错误</h3>
            <p>工具配置有误</p>
        </div>
    `;
        }
    }).join('') : `
        <div class="tool-detail" id="tool-detail-empty" style="display: block;">
            <h3>⚠️ 工具未加载</h3>
            <p>${statusMessage}</p>
            <p>请确保 MCP 服务器已完全启动并初始化。</p>
            <div class="example-params">
                <h4>可能的原因：</h4>
                <ul>
                    <li>服务器正在启动中，工具注册器尚未初始化</li>
                    <li>服务器启动失败</li>
                    <li>工具注册过程中出现错误</li>
                </ul>
                <p>请稍等片刻后刷新页面，或检查服务器日志。</p>
            </div>
        </div>
    `;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 测试工具</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: #ecf0f1;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
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
            background: linear-gradient(135deg, #3498db, #9b59b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: #bdc3c7;
            font-size: 1.1rem;
            margin-bottom: 15px;
        }
        .status-info {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 15px;
        }
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .status-success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
            border: 1px solid rgba(46, 204, 113, 0.3);
        }
        .status-warning {
            background: rgba(241, 196, 15, 0.2);
            color: #f1c40f;
            border: 1px solid rgba(241, 196, 15, 0.3);
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 20px;
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
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #bdc3c7;
        }
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ecf0f1;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        .form-group textarea {
            min-height: 150px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
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
            margin-right: 10px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
        }
        .btn-success {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
        }
        .btn-warning {
            background: linear-gradient(135deg, #f39c12, #d35400);
        }
        .result-container {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            display: none;
        }
        .result-container.success {
            border-left: 4px solid #2ecc71;
        }
        .result-container.error {
            border-left: 4px solid #e74c3c;
        }
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .result-title {
            font-size: 1.2rem;
            font-weight: 600;
        }
        .result-content {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow-y: auto;
        }
        .tool-detail {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
        }
        .tool-detail h3 {
            margin-bottom: 10px;
            color: #3498db;
        }
        .tool-detail h4 {
            margin: 15px 0 10px 0;
            color: #9b59b6;
        }
        .tool-detail p {
            line-height: 1.6;
            color: #bdc3c7;
        }
        .schema {
            background: rgba(0, 0, 0, 0.5);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85rem;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .example-params {
            margin-top: 10px;
            padding: 10px;
            background: rgba(52, 152, 219, 0.2);
            border-radius: 8px;
            font-size: 0.9rem;
        }
        .example-params h4 {
            margin-bottom: 8px;
            color: #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🧪 API 测试工具</h1>
            <p class="subtitle">NexusGUI MCP 工具调用测试</p>
            <div class="status-info">
                <span class="status-badge ${hasTools ? 'status-success' : 'status-warning'}">
                    ${hasTools ? '✅' : '⚠️'} ${statusMessage}
                </span>
                ${!hasTools ? '<button class="btn btn-secondary" onclick="location.reload()" style="margin-left: 10px;">🔄 刷新</button>' : ''}
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">🔧</div>
                <div class="card-title">工具选择</div>
            </div>
            
            <div class="form-group">
                <label for="toolSelect">选择要测试的工具:</label>
                <select id="toolSelect" onchange="showToolDetails()">
                    <option value="">-- 请选择工具 --</option>
                    ${toolOptions}
                </select>
            </div>
            
            <div id="toolDetailsContainer">
                ${toolDetails}
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">⚙️</div>
                <div class="card-title">参数配置</div>
            </div>
            
            <div class="form-group">
                <label for="toolParams">工具参数 (JSON 格式):</label>
                <textarea id="toolParams" placeholder='{
  "param1": "value1",
  "param2": "value2"
}'></textarea>
            </div>
            
            <div class="actions">
                <button class="btn" onclick="executeTool()">▶️ 执行工具</button>
                <button class="btn btn-secondary" onclick="clearParams()">🗑️ 清空参数</button>
                <button class="btn btn-warning" onclick="loadExampleParams()">📝 加载示例</button>
            </div>
            
            <div id="resultContainer" class="result-container">
                <div class="result-header">
                    <div class="result-title">执行结果</div>
                    <button class="btn btn-secondary" onclick="clearResult()" style="padding: 5px 10px; font-size: 0.9rem;">×</button>
                </div>
                <div id="resultContent" class="result-content"></div>
            </div>
        </div>
    </div>

    <script>
        // 显示工具详细信息
        function showToolDetails() {
            const selectedTool = document.getElementById('toolSelect').value;
            
            // 隐藏所有工具详情
            document.querySelectorAll('.tool-detail').forEach(detail => {
                detail.style.display = 'none';
            });
            
            // 显示选中工具的详情
            if (selectedTool) {
                // 安全地构造 ID，防止 DOM XSS
                const safeId = selectedTool.replace(/[^a-zA-Z0-9_-]/g, '_');
                const targetElement = document.getElementById('tool-detail-' + safeId);
                if (targetElement) {
                    targetElement.style.display = 'block';
                }
            }
        }
        
        // 执行工具
        async function executeTool() {
            const selectedTool = document.getElementById('toolSelect').value;
            const paramsText = document.getElementById('toolParams').value;
            
            if (!selectedTool) {
                alert('请选择要测试的工具');
                return;
            }
            
            let params = {};
            if (paramsText.trim()) {
                try {
                    // 限制 JSON 字符串长度，防止 DoS 攻击
                    if (paramsText.length > 10000) {
                        alert('参数内容过长，请减少参数数量');
                        return;
                    }
                    params = JSON.parse(paramsText);
                    
                    // 验证解析结果是否为对象
                    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
                        alert('参数必须是一个有效的 JSON 对象');
                        return;
                    }
                } catch (error) {
                    alert('参数格式错误: ' + error.message);
                    return;
                }
            }
            
            // 显示执行中状态
            const resultContainer = document.getElementById('resultContainer');
            const resultContent = document.getElementById('resultContent');
            resultContainer.className = 'result-container';
            resultContainer.style.display = 'block';
            resultContent.textContent = '⏳ 正在执行工具，请稍候...';
            
            try {
                console.log('执行工具:', selectedTool, params);
                
                // 检查 electronAPI 是否可用
                if (!window.electronAPI || !window.electronAPI.executeMCPTool) {
                    throw new Error('electronAPI 不可用，无法执行工具');
                }
                
                // 调用主进程执行真实工具
                const result = await window.electronAPI.executeMCPTool(selectedTool, params);
                
                console.log('工具执行结果:', result);
                showResult(result);
                
            } catch (error) {
                console.error('工具执行失败:', error);
                
                // 显示错误结果
                const errorResult = {
                    success: false,
                    tool: selectedTool,
                    params: params,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                showResult(errorResult);
            }
        }
        
        // 显示执行结果
        function showResult(result) {
            const resultContainer = document.getElementById('resultContainer');
            const resultContent = document.getElementById('resultContent');
            
            if (result && result.success) {
                resultContainer.className = 'result-container success';
                try {
                    // 安全地序列化结果，限制深度和长度
                    const safeResult = JSON.stringify(result, null, 2);
                    if (safeResult.length > 50000) {
                        resultContent.textContent = '结果过长，已截断:\\n' + safeResult.substring(0, 50000) + '\\n...[截断]';
                    } else {
                        resultContent.textContent = safeResult;
                    }
                } catch (error) {
                    resultContent.textContent = '✅ 工具执行成功，但结果无法序列化显示';
                }
            } else {
                resultContainer.className = 'result-container error';
                const errorMsg = result && result.error ? String(result.error).substring(0, 1000) : '未知错误';
                resultContent.textContent = '❌ 工具执行失败\\n\\n' + errorMsg;
            }
            
            resultContainer.style.display = 'block';
        }
        
        // 清空参数
        function clearParams() {
            document.getElementById('toolParams').value = '';
        }
        
        // 清空结果
        function clearResult() {
            document.getElementById('resultContainer').style.display = 'none';
        }
        
        // 加载示例参数
        function loadExampleParams() {
            const selectedTool = document.getElementById('toolSelect').value;
            if (!selectedTool) {
                alert('请先选择一个工具');
                return;
            }
            
            // 根据选中的工具加载示例参数
            const exampleParams = getExampleParams(selectedTool);
            if (exampleParams) {
                document.getElementById('toolParams').value = JSON.stringify(exampleParams, null, 2);
            }
        }
        
        // 获取示例参数
        function getExampleParams(toolName) {
            // 验证工具名称，防止原型污染攻击
            if (typeof toolName !== 'string' || !toolName) {
                return {};
            }
            
            const examples = {
                'render-gui': {
                    title: '测试界面',
                    width: 800,
                    height: 600,
                    html: '<div style="padding: 20px;"><h1>测试界面</h1><p>这是一个测试界面</p></div>'
                },
                'get-gui': {
                    format: 'summary',
                    returnType: 'both'
                },
                'inject-js': {
                    code: 'alert("Hello from injected JS!");',
                    waitForResult: false
                },
                'show-in-file-manager': {
                    filePath: '/path/to/your/file.md'
                },
                'render-history': {
                    action: 'list'
                },
                'quick-test': {
                    testType: 'basic'
                },
                'network-status': {},
                'debug-logs': {
                    lines: 50,
                    level: 'INFO'
                },
                'monitor-info': {}
            };
            
            // 使用 hasOwnProperty 防止原型污染
            return Object.prototype.hasOwnProperty.call(examples, toolName) ? examples[toolName] : {};
        }
        
        // 刷新工具列表
        async function refreshTools() {
            try {
                console.log('🔄 刷新工具列表...');
                
                if (!window.electronAPI || !window.electronAPI.getAvailableTools) {
                    console.error('electronAPI 不可用');
                    return;
                }
                
                const response = await window.electronAPI.getAvailableTools();
                
                if (response.success && response.tools.length > 0) {
                    console.log('✅ 获取到工具列表:', response.tools.length, '个工具');
                    
                    // 重新生成页面内容
                    location.reload();
                } else {
                    console.log('⚠️ 没有可用工具:', response.error || '未知原因');
                }
            } catch (error) {
                console.error('❌ 刷新工具列表失败:', error);
            }
        }
        
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🧪 API 测试工具已加载');
            
            // 如果没有工具，尝试从主进程获取
            if (!${hasTools}) {
                console.log('🔍 页面没有工具数据，尝试从主进程获取...');
                
                try {
                    if (window.electronAPI && window.electronAPI.getAvailableTools) {
                        const response = await window.electronAPI.getAvailableTools();
                        
                        if (response.success && response.tools.length > 0) {
                            console.log('✅ 从主进程获取到工具:', response.tools.length, '个');
                            
                            // 动态更新页面状态
                            const statusBadge = document.querySelector('.status-badge');
                            if (statusBadge) {
                                statusBadge.className = 'status-badge status-success';
                                statusBadge.innerHTML = '✅ 已加载 ' + response.tools.length + ' 个工具';
                            }
                            
                            // 更新工具选择器
                            const toolSelect = document.getElementById('toolSelect');
                            if (toolSelect) {
                                toolSelect.innerHTML = '<option value="">-- 请选择工具 --</option>' +
                                    response.tools.map(tool => {
                                        const name = tool.name || 'unknown';
                                        const description = tool.description || '无描述';
                                        const firstLine = description.split('\\n')[0];
                                        return \`<option value="\${name}">\${name} - \${firstLine}</option>\`;
                                    }).join('');
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ 从主进程获取工具失败:', error);
                }
            }
        });
    </script>
</body>
</html>`;
}

module.exports = { generateAPITestToolHTML };