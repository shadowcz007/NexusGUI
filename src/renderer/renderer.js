// NexusGUI 动态渲染器
// 负责接收 GUI 定义并动态创建界面

console.log('🎨 NexusGUI 渲染器已加载');

// 全局数据存储
globalThis.__gui_data__ = {};

// 错误处理工具
function showError(message, details = '') {
    const modal = document.getElementById('error-modal');
    const messageEl = document.getElementById('error-message');

    messageEl.textContent = details ? `${message}\n详细信息: ${details}` : message;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// 关闭错误模态框
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-error');
    const modal = document.getElementById('error-modal');

    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
});

// HTML 渲染模式 - 简化的初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM 已加载，HTML 渲染模式就绪');

    // 检查 electronAPI 是否可用
    if (!window.electronAPI) {
        console.error('❌ electronAPI 不可用');
        showError('通信接口不可用', '无法与主进程通信');
        return;
    }

    console.log('✅ HTML 渲染模式已就绪');

    // 注入全局辅助函数供 HTML 内容使用
    window.sendResult = (result) => {
        console.log('📤 发送结果到主进程:', result);
        window.electronAPI.send('mcp-result', result);
    };

    window.getFormData = (selector = 'body') => {
        return window.electronAPI.getFormData(selector);
    };
});


// HTML 渲染模式不需要复杂的渲染函数
// HTML 内容直接通过 main.js 中的 loadURL 加载

// HTML 渲染模式不需要组件创建函数
// HTML 内容直接渲染，所有交互通过标准 HTML/JS 实现

// 工具函数：获取表单数据
function getFormData(formSelector = 'body') {
    const form = document.querySelector(formSelector);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // 处理复选框
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.name && !data.hasOwnProperty(cb.name)) {
            data[cb.name] = cb.checked;
        }
    });

    return data;
}

// 工具函数：主题切换
function switchTheme(theme) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(`${theme}-theme`);

    // 保存主题偏好
    localStorage.setItem('nexusgui-theme', theme);
}

// 初始化主题
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('nexusgui-theme') || 'light';
    switchTheme(savedTheme);
});

console.log('✅ NexusGUI 渲染器初始化完成');