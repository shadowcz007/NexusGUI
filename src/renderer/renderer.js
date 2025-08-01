// 全局变量
let currentLocale = 'en-US';
let translations = {};

// 初始化应用程序
async function initializeApp() {
    try {
        console.log('🚀 初始化应用程序...');
        
        // 获取当前语言
        currentLocale = await window.electronAPI.getCurrentLocale();
        console.log('当前语言:', currentLocale);
        
        // 加载翻译
        await loadTranslations();
        
        // 更新 UI 文本
        updateUIText();
        
        // 监听语言变更
        window.electronAPI.onLanguageChanged(async (newLocale) => {
            console.log('语言已更改为:', newLocale);
            currentLocale = newLocale;
            await loadTranslations();
            updateUIText();
        });
        
        // 设置语言选择器
        setupLanguageSelector();
        
        console.log('✅ 应用程序初始化完成');
        
    } catch (error) {
        console.error('❌ 应用程序初始化失败:', error);
    }
}

// 加载翻译
async function loadTranslations() {
    try {
        // 这里我们直接使用主进程的翻译功能
        // 在实际应用中，您可能需要根据具体需求调整
        console.log('📚 翻译已通过主进程加载');
    } catch (error) {
        console.error('加载翻译失败:', error);
    }
}

// 翻译函数
async function t(key, fallback = null) {
    try {
        return await window.electronAPI.t(key, fallback);
    } catch (error) {
        console.error('翻译失败:', error);
        return fallback || key;
    }
}

// 更新 UI 文本
async function updateUIText() {
    try {
        console.log('🔄 更新 UI 文本...');
        
        // 更新页面标题
        document.title = await t('app.title');
        
        // 更新所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        for (const element of elements) {
            const key = element.getAttribute('data-i18n');
            const translatedText = await t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
                element.value = translatedText;
            } else if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translatedText;
            } else {
                element.textContent = translatedText;
            }
        }
        
        // 更新特定元素
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement) {
            welcomeElement.textContent = await t('app.welcome');
        }
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = await t('status.ready');
        }
        
        console.log('✅ UI 文本更新完成');
        
    } catch (error) {
        console.error('❌ 更新 UI 文本失败:', error);
    }
}

// 设置语言选择器
async function setupLanguageSelector() {
    try {
        const languageSelector = document.getElementById('language-selector');
        if (!languageSelector) return;
        
        const supportedLocales = await window.electronAPI.getSupportedLocales();
        const currentLocale = await window.electronAPI.getCurrentLocale();
        
        // 清空现有选项
        languageSelector.innerHTML = '';
        
        // 添加语言选项
        const localeNames = {
            'en-US': 'English',
            'zh-CN': '简体中文'
        };
        
        supportedLocales.forEach(locale => {
            const option = document.createElement('option');
            option.value = locale;
            option.textContent = localeNames[locale] || locale;
            option.selected = locale === currentLocale;
            languageSelector.appendChild(option);
        });
        
        // 监听语言选择变更
        languageSelector.addEventListener('change', async (event) => {
            const newLocale = event.target.value;
            console.log('切换语言到:', newLocale);
            
            const success = await window.electronAPI.setLocale(newLocale);
            if (success) {
                console.log('语言切换成功');
            } else {
                console.error('语言切换失败');
                // 恢复到之前的选择
                event.target.value = currentLocale;
            }
        });
        
    } catch (error) {
        console.error('设置语言选择器失败:', error);
    }
}

// 创建示例界面
async function createSampleUI() {
    const container = document.getElementById('app-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="header">
            <h1 id="welcome-message" data-i18n="app.welcome">${await t('app.welcome')}</h1>
            <p data-i18n="app.description">${await t('app.description')}</p>
        </div>
        
        <div class="language-section">
            <label for="language-selector" data-i18n="settings.language">${await t('settings.language')}:</label>
            <select id="language-selector" class="language-selector">
                <!-- 选项将通过 JavaScript 动态添加 -->
            </select>
        </div>
        
        <div class="content">
            <div class="card">
                <h3 data-i18n="menu.settings">${await t('menu.settings')}</h3>
                <p data-i18n="settings.general">${await t('settings.general')}</p>
                <button class="btn btn-primary" data-i18n="common.apply">${await t('common.apply')}</button>
            </div>
            
            <div class="card">
                <h3 data-i18n="status.ready">${await t('status.ready')}</h3>
                <p id="status" data-i18n="status.ready">${await t('status.ready')}</p>
                <button class="btn btn-secondary" onclick="testTranslation()" data-i18n="common.info">${await t('common.info')}</button>
            </div>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 <span data-i18n="app.title">${await t('app.title')}</span></p>
        </div>
    `;
    
    // 重新设置语言选择器
    await setupLanguageSelector();
}

// 测试翻译功能
async function testTranslation() {
    const messages = [
        await t('common.success'),
        await t('common.loading'),
        await t('common.error'),
        await t('status.connected')
    ];
    
    alert(messages.join('\n'));
}

// 处理动态 GUI 渲染
function handleDynamicGUI(guiData) {
    console.log('🎨 渲染动态 GUI:', guiData);
    
    const container = document.getElementById('dynamic-content');
    if (!container) {
        console.error('找不到动态内容容器');
        return;
    }
    
    try {
        if (guiData.html) {
            container.innerHTML = guiData.html;
        } else if (guiData.components) {
            // 处理组件式 GUI
            renderComponents(container, guiData.components);
        }
        
        // 更新动态内容的翻译
        updateUIText();
        
    } catch (error) {
        console.error('渲染动态 GUI 失败:', error);
        container.innerHTML = `<div class="error">渲染失败: ${error.message}</div>`;
    }
}

// 渲染组件
function renderComponents(container, components) {
    container.innerHTML = '';
    
    components.forEach(component => {
        const element = createComponent(component);
        if (element) {
            container.appendChild(element);
        }
    });
}

// 创建组件
function createComponent(component) {
    const { type, props = {}, children = [] } = component;
    
    let element;
    
    switch (type) {
        case 'div':
        case 'span':
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
            element = document.createElement(type);
            break;
        case 'button':
            element = document.createElement('button');
            element.className = 'btn btn-primary';
            break;
        case 'input':
            element = document.createElement('input');
            break;
        case 'select':
            element = document.createElement('select');
            break;
        default:
            console.warn('未知组件类型:', type);
            return null;
    }
    
    // 设置属性
    Object.keys(props).forEach(key => {
        if (key === 'className') {
            element.className = props[key];
        } else if (key === 'onClick') {
            element.addEventListener('click', new Function(props[key]));
        } else if (key === 'i18n') {
            element.setAttribute('data-i18n', props[key]);
        } else {
            element.setAttribute(key, props[key]);
        }
    });
    
    // 处理子元素
    if (typeof children === 'string') {
        element.textContent = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                const childElement = createComponent(child);
                if (childElement) {
                    element.appendChild(childElement);
                }
            }
        });
    }
    
    return element;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM 加载完成');
    
    // 初始化应用程序
    await initializeApp();
    
    // 创建示例界面
    await createSampleUI();
    
    // 监听来自主进程的动态 GUI 渲染请求
    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('render-dynamic-gui', handleDynamicGUI);
    }
});

// 监听语言变更事件
window.addEventListener('language-changed', async (event) => {
    console.log('🌐 收到语言变更事件:', event.detail);
    await updateUIText();
});

// 全局函数，供外部调用
window.updateUIText = updateUIText;
window.t = t;
window.testTranslation = testTranslation;

console.log('🎯 渲染进程脚本已加载');