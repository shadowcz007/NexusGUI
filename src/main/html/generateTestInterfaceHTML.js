/**
 * 生成测试界面 HTML
 * @param {string} testName - 测试名称
 * @returns {string} HTML 内容
 */
function generateTestInterfaceHTML(testName) {
    const testInterfaces = {
        'basic': `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基础测试界面</title>
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
            font-size: 2rem;
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
        .content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .card h3 {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .card p {
            color: #666;
            line-height: 1.6;
        }
        .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
        }
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🚀 基础测试界面</h1>
            <p class="subtitle">用于测试 NexusGUI 基本功能的界面</p>
        </div>
        
        <div class="content">
            <div class="card">
                <h3>窗口功能测试</h3>
                <p>测试窗口的基本功能，包括大小调整、移动、最小化、最大化等。</p>
            </div>
            
            <div class="card">
                <h3>渲染性能测试</h3>
                <p>测试界面渲染性能，包括 HTML、CSS 和 JavaScript 的执行效率。</p>
            </div>
            
            <div class="card">
                <h3>交互功能测试</h3>
                <p>测试用户交互功能，包括按钮点击、表单提交、事件处理等。</p>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="handlePrimaryAction()">主要操作</button>
            <button class="btn btn-secondary" onclick="handleSecondaryAction()">次要操作</button>
        </div>
        
        <div class="footer">
            <p>NexusGUI 基础测试界面</p>
        </div>
    </div>
    
    <script>
        function handlePrimaryAction() {
            alert('主要操作已执行！');
        }
        
        function handleSecondaryAction() {
            alert('次要操作已执行！');
        }
        
        console.log('🎨 基础测试界面已加载');
    </script>
</body>
</html>`,
        
        'form': `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>表单测试界面</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
            backdrop-filter: blur(10px);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #f093fb, #f5576c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #f093fb;
            box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.2);
        }
        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .checkbox-group input {
            width: auto;
            margin-right: 10px;
        }
        .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            flex: 1;
        }
        .btn-primary {
            background: #f093fb;
            color: white;
        }
        .btn-primary:hover {
            background: #f5576c;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">📝 表单测试界面</h1>
            <p class="subtitle">用于测试表单处理和数据提交功能</p>
        </div>
        
        <form id="testForm">
            <div class="form-group">
                <label for="name">姓名</label>
                <input type="text" id="name" name="name" placeholder="请输入您的姓名" required>
            </div>
            
            <div class="form-group">
                <label for="email">邮箱</label>
                <input type="email" id="email" name="email" placeholder="请输入您的邮箱" required>
            </div>
            
            <div class="form-group">
                <label for="age">年龄</label>
                <input type="number" id="age" name="age" placeholder="请输入您的年龄" min="1" max="120">
            </div>
            
            <div class="form-group">
                <label for="gender">性别</label>
                <select id="gender" name="gender">
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="message">留言</label>
                <textarea id="message" name="message" placeholder="请输入您的留言"></textarea>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="subscribe" name="subscribe" value="yes">
                <label for="subscribe">订阅我们的新闻通讯</label>
            </div>
            
            <div class="actions">
                <button type="button" class="btn btn-primary" onclick="submitForm()">提交</button>
                <button type="button" class="btn btn-secondary" onclick="resetForm()">重置</button>
            </div>
        </form>
        
        <div class="footer">
            <p>NexusGUI 表单测试界面</p>
        </div>
    </div>
    
    <script>
        function submitForm() {
            const formData = new FormData(document.getElementById('testForm'));
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            console.log('表单数据:', data);
            alert('表单已提交！\\n' + JSON.stringify(data, null, 2));
        }
        
        function resetForm() {
            document.getElementById('testForm').reset();
            alert('表单已重置！');
        }
        
        console.log('📝 表单测试界面已加载');
    </script>
</body>
</html>`,
        
        'dashboard': `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>仪表板测试界面</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
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
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border-left: 4px solid #4facfe;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .stat-card h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #666;
            margin-bottom: 10px;
        }
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #4facfe;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .chart-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .chart-card h3 {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
        }
        .chart-placeholder {
            height: 300px;
            background: #f8fafc;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 1.1rem;
        }
        .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
        }
        .btn-primary {
            background: #4facfe;
            color: white;
        }
        .btn-primary:hover {
            background: #00f2fe;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">📊 仪表板测试界面</h1>
            <p class="subtitle">用于测试复杂界面布局和数据展示功能</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>用户总数</h3>
                <div class="value">1,234</div>
            </div>
            
            <div class="stat-card">
                <h3>活跃用户</h3>
                <div class="value">567</div>
            </div>
            
            <div class="stat-card">
                <h3>订单数量</h3>
                <div class="value">890</div>
            </div>
            
            <div class="stat-card">
                <h3>收入总额</h3>
                <div class="value">¥123,456</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-card">
                <h3>用户增长趋势</h3>
                <div class="chart-placeholder">
                    📈 折线图占位符
                </div>
            </div>
            
            <div class="chart-card">
                <h3>设备分布</h3>
                <div class="chart-placeholder">
                    📊 饼图占位符
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="refreshData()">刷新数据</button>
            <button class="btn btn-secondary" onclick="exportData()">导出数据</button>
        </div>
        
        <div class="footer">
            <p>NexusGUI 仪表板测试界面</p>
        </div>
    </div>
    
    <script>
        function refreshData() {
            alert('数据已刷新！');
        }
        
        function exportData() {
            alert('数据已导出！');
        }
        
        console.log('📊 仪表板测试界面已加载');
    </script>
</body>
</html>`
    };
    
    return testInterfaces[testName] || testInterfaces['basic'];
}

module.exports = { generateTestInterfaceHTML };