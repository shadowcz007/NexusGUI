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

// 监听来自主进程的 GUI 渲染指令
window.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM 已加载，等待 GUI 定义...');

    // 检查 electronAPI 是否可用
    if (!window.electronAPI) {
        console.error('❌ electronAPI 不可用');
        showError('通信接口不可用', '无法与主进程通信');
        return;
    }

    console.log('✅ electronAPI 可用');

    window.electronAPI.on('render-dynamic-gui', (config) => {
        console.log('🎯 收到组件模式 GUI 配置:', config);
        console.log('📊 配置详情:', {
            title: config.title,
            componentsCount: (config.components && config.components.length) || 0,
            hasData: !!config.data,
            hasCallbacks: !!config.callbacks,
            html: config.html
        });

        try {
            renderGUI(config);
        } catch (error) {
            console.error('❌ GUI 渲染失败:', error);
            showError('界面渲染失败', error.message);
        }
    });
});


// 主渲染函数
function renderGUI(config) {
    console.log('🎨 开始渲染 GUI...');

    // 更新页面标题
    if (config.title) {
        document.title = config.title;
        console.log('📝 页面标题已更新:', config.title);
    }

    // 获取应用容器
    const app = document.getElementById('app');
    if (!app) {
        throw new Error('找不到应用容器元素 #app');
    }

    console.log('✅ 找到应用容器');

    // 注入初始数据到全局
    globalThis.__gui_data__ = config.data || {};
    console.log('💾 已注入初始数据:', globalThis.__gui_data__);

    // 渲染组件
    if (Array.isArray(config.components) && config.components.length > 0) {
        console.log(`📦 开始渲染 ${config.components.length} 个组件`);
        // 清空现有内容
        app.innerHTML = '';
        config.components.forEach((comp, index) => {
            console.log(`🎯 渲染组件 ${index + 1}/${config.components.length}:`, comp.type);

            try {
                const el = createComponent(comp, config.callbacks);
                if (el) {
                    app.appendChild(el);
                    console.log(`✅ 组件 ${index + 1} 渲染成功:`, comp.type);
                } else {
                    console.warn(`⚠️ 组件 ${index + 1} 返回空元素:`, comp.type);
                }
            } catch (error) {
                console.error(`❌ 组件 ${index + 1} 渲染失败:`, comp, error);
                const errorEl = createErrorComponent(comp, error);
                app.appendChild(errorEl);
            }
        });
    } else {
        console.warn('⚠️ 未提供有效的组件数组');
        app.innerHTML = '<div class="text-center py-8 text-gray-500">未提供界面组件</div>';
    }

    console.log('✅ GUI 渲染完成');
}

// 创建错误提示组件
function createErrorComponent(failedComp, error) {
    const el = document.createElement('div');
    el.className = 'error-component';

    const title = document.createElement('div');
    title.className = 'error-title';
    title.textContent = `组件渲染失败: ${failedComp?.type || '未知类型'}`;

    const message = document.createElement('div');
    message.className = 'error-message';
    message.textContent = error.message;

    el.appendChild(title);
    el.appendChild(message);
    return el;
}

// 核心组件创建函数
function createComponent(comp, callbacks) {
    if (!comp || typeof comp !== 'object') {
        throw new Error('无效的组件定义');
    }

    let el;

    try {
        switch (comp.type) {
            case 'heading':
                el = document.createElement(`h${comp.level || 2}`);
                el.textContent = comp.text || '标题';
                el.className = comp.className || '';
                break;

            case 'text':
                el = document.createElement('p');
                el.textContent = comp.text || '';
                el.className = comp.className || '';
                break;

            case 'input':
                const inputContainer = document.createElement('div');
                inputContainer.className = 'form-group';

                const label = document.createElement('label');
                label.textContent = comp.label || '输入项';
                label.className = 'form-label';

                const input = document.createElement('input');
                input.name = comp.name || `input_${Date.now()}`;
                input.type = comp.inputType || 'text';
                input.value = comp.name ? (globalThis.__gui_data__[comp.name] || '') : '';
                input.placeholder = comp.placeholder || '';
                input.className = 'form-input';

                if (comp.required) input.required = true;
                if (comp.disabled) input.disabled = true;
                if (comp.maxLength) input.maxLength = comp.maxLength;

                label.htmlFor = input.name;
                inputContainer.appendChild(label);
                inputContainer.appendChild(input);
                el = inputContainer;
                break;

            case 'textarea':
                const textareaContainer = document.createElement('div');
                textareaContainer.className = 'form-group';

                const textareaLabel = document.createElement('label');
                textareaLabel.textContent = comp.label || '文本区域';
                textareaLabel.className = 'form-label';

                const textarea = document.createElement('textarea');
                textarea.name = comp.name || `textarea_${Date.now()}`;
                textarea.rows = comp.rows || 3;
                textarea.value = comp.name ? (globalThis.__gui_data__[comp.name] || '') : '';
                textarea.placeholder = comp.placeholder || '';
                textarea.className = 'form-input';

                if (comp.required) textarea.required = true;
                if (comp.disabled) textarea.disabled = true;

                textareaLabel.htmlFor = textarea.name;
                textareaContainer.appendChild(textareaLabel);
                textareaContainer.appendChild(textarea);
                el = textareaContainer;
                break;

            case 'select':
                const selectContainer = document.createElement('div');
                selectContainer.className = 'select-container';

                const selectLabel = document.createElement('label');
                selectLabel.textContent = comp.label || '选择项';
                selectLabel.className = 'form-label';

                const select = document.createElement('select');
                select.name = comp.name || `select_${Date.now()}`;
                select.className = 'select-input';

                if (comp.required) select.required = true;
                if (comp.disabled) select.disabled = true;

                // 添加选项
                if (Array.isArray(comp.options)) {
                    comp.options.forEach(option => {
                        const optEl = document.createElement('option');
                        optEl.value = option.value || option;
                        optEl.textContent = option.label || option;
                        if (option.selected) optEl.selected = true;
                        select.appendChild(optEl);
                    });
                }

                selectLabel.htmlFor = select.name;
                selectContainer.appendChild(selectLabel);
                selectContainer.appendChild(select);
                el = selectContainer;
                break;

            case 'checkbox':
                el = document.createElement('div');
                el.className = 'checkbox-container';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = comp.name || `checkbox_${Date.now()}`;
                checkbox.id = checkbox.name;
                if (comp.checked) checkbox.checked = true;
                if (comp.disabled) checkbox.disabled = true;

                const checkboxLabel = document.createElement('label');
                checkboxLabel.htmlFor = checkbox.id;
                checkboxLabel.textContent = comp.label || '选项';

                el.appendChild(checkbox);
                el.appendChild(checkboxLabel);
                break;

            case 'radio-group':
                el = document.createElement('fieldset');
                el.className = 'form-group';

                const legend = document.createElement('legend');
                legend.textContent = comp.label || '选项组';
                legend.className = 'form-label';
                el.appendChild(legend);

                if (Array.isArray(comp.options)) {
                    const groupName = comp.name || `radio_group_${Date.now()}`;
                    comp.options.forEach((option, idx) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'radio-container';

                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = groupName;
                        radio.id = `${groupName}_${idx}`;
                        radio.value = option.value || option;
                        if (option.checked) radio.checked = true;

                        const radioLabel = document.createElement('label');
                        radioLabel.htmlFor = radio.id;
                        radioLabel.textContent = option.label || option;

                        wrapper.appendChild(radio);
                        wrapper.appendChild(radioLabel);
                        el.appendChild(wrapper);
                    });
                }
                break;

            case 'button':
                el = document.createElement('button');
                el.textContent = comp.text || '按钮';
                el.className = `btn ${comp.className || 'btn-primary'}`;
                if (comp.disabled) el.disabled = true;

                const handlerCode = comp.onClick && callbacks && callbacks[comp.onClick];
                if (handlerCode) {
                    el.onclick = () => {
                        try {
                            // 安全执行：传入上下文
                            const fn = new Function('data', 'sendResult', 'getFormData', handlerCode);
                            fn(
                                globalThis.__gui_data__,
                                (result) => {
                                    console.log('📤 发送结果到主进程:', result);
                                    window.electronAPI.send('mcp-result', result);
                                },
                                (selector) => {
                                    return window.electronAPI.getFormData(selector || 'body');
                                }
                            );
                        } catch (err) {
                            console.error('回调执行失败:', err);
                            showError('操作执行失败', err.message);
                        }
                    };
                }
                break;

            case 'image':
                el = document.createElement('img');
                el.src = comp.src || '';
                el.alt = comp.alt || '';
                el.className = `image-component ${comp.className || ''}`;
                if (comp.width) el.width = comp.width;
                if (comp.height) el.height = comp.height;
                break;

            case 'divider':
                el = document.createElement('hr');
                el.className = `divider ${comp.className || ''}`;
                break;

            case 'container':
                el = document.createElement('div');
                el.className = `container-component ${comp.className || ''}`;

                // 递归渲染子组件
                if (Array.isArray(comp.children)) {
                    comp.children.forEach(childComp => {
                        try {
                            const childEl = createComponent(childComp, callbacks);
                            if (childEl) el.appendChild(childEl);
                        } catch (error) {
                            console.error(`子组件渲染失败: ${childComp.type}`, error);
                            const errorEl = createErrorComponent(childComp, error);
                            el.appendChild(errorEl);
                        }
                    });
                }
                break;

            case 'link':
                el = document.createElement('a');
                el.href = comp.href || '#';
                el.textContent = comp.text || '链接';
                el.className = `link-component ${comp.className || ''}`;
                if (comp.target) el.target = comp.target;
                break;

            case 'progress':
                el = document.createElement('div');
                el.className = 'progress-container';

                if (comp.label) {
                    const progressLabel = document.createElement('label');
                    progressLabel.textContent = comp.label;
                    progressLabel.className = 'form-label';
                    el.appendChild(progressLabel);
                }

                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';

                const progressFill = document.createElement('div');
                progressFill.className = `progress-fill ${comp.fillClassName || ''}`;
                progressFill.style.width = `${Math.min(100, Math.max(0, comp.value || 0))}%`;

                progressBar.appendChild(progressFill);
                el.appendChild(progressBar);

                if (comp.showValue) {
                    const valueText = document.createElement('div');
                    valueText.className = 'progress-text';
                    valueText.textContent = `${comp.value || 0}%`;
                    el.appendChild(valueText);
                }
                break;

            case 'tag':
                el = document.createElement('span');
                el.textContent = comp.text || '';
                el.className = `tag ${comp.className || 'tag-default'}`;
                break;

            case 'card':
                el = document.createElement('div');
                el.className = `card ${comp.className || ''}`;

                if (comp.title) {
                    const cardTitle = document.createElement('h3');
                    cardTitle.className = 'card-title';
                    cardTitle.textContent = comp.title;
                    el.appendChild(cardTitle);
                }

                if (comp.content) {
                    const cardContent = document.createElement('p');
                    cardContent.textContent = comp.content;
                    cardContent.className = 'card-content';
                    el.appendChild(cardContent);
                }

                // 递归渲染子组件
                if (Array.isArray(comp.children)) {
                    comp.children.forEach(childComp => {
                        try {
                            const childEl = createComponent(childComp, callbacks);
                            if (childEl) el.appendChild(childEl);
                        } catch (error) {
                            console.error(`子组件渲染失败: ${childComp.type}`, error);
                            const errorEl = createErrorComponent(childComp, error);
                            el.appendChild(errorEl);
                        }
                    });
                }
                break;

            case 'chart':
                el = document.createElement('div');
                el.id = comp.id || `chart_${Date.now()}`;
                el.className = `chart-container ${comp.className || ''}`;
                el.style.width = comp.width || '100%';
                el.style.height = comp.height || '400px';

                // 创建 canvas 元素用于图表
                const canvas = document.createElement('canvas');
                el.appendChild(canvas);

                // 在下一个事件循环中初始化图表
                setTimeout(() => {
                    try {
                        if (typeof Chart !== 'undefined') {
                            const ctx = canvas.getContext('2d');
                            new Chart(ctx, {
                                type: comp.chartType || 'bar',
                                data: comp.data || { labels: [], datasets: [] },
                                options: comp.options || {}
                            });
                        } else {
                            el.innerHTML = '<div class="p-4 text-center text-gray-500">图表库未加载</div>';
                        }
                    } catch (err) {
                        console.error('图表渲染失败:', err);
                        el.innerHTML = '<div class="error-component"><div class="error-title">图表渲染失败</div><div class="error-message">' + err.message + '</div></div>';
                    }
                }, 0);
                break;

            default:
                // 未知组件类型
                el = document.createElement('div');
                el.className = 'unknown-component';
                el.textContent = `未知组件类型: ${comp.type || '未指定'}`;
        }

        // 通用属性处理
        if (comp.id && el) el.id = comp.id;
        if (comp.style && el && typeof comp.style === 'object') {
            Object.assign(el.style, comp.style);
        }
        if (comp.attributes && el && typeof comp.attributes === 'object') {
            Object.entries(comp.attributes).forEach(([key, value]) => {
                el.setAttribute(key, value);
            });
        }
        if (comp.dataset && el && typeof comp.dataset === 'object') {
            Object.entries(comp.dataset).forEach(([key, value]) => {
                el.dataset[key] = value;
            });
        }

        return el;
    } catch (error) {
        console.error(`组件 ${comp.type} 创建失败:`, error);
        throw error;
    }
}

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