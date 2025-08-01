const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // i18n 相关 API
    getCurrentLocale: () => ipcRenderer.invoke('get-current-locale'),
    setLocale: (locale) => ipcRenderer.invoke('set-locale', locale),
    t: (key, fallback) => ipcRenderer.invoke('get-translation', key, fallback),
    getSupportedLocales: () => ipcRenderer.invoke('get-supported-locales'),
    
    // 监听语言变更事件
    onLanguageChanged: (callback) => {
        ipcRenderer.on('language-changed', (event, locale) => {
            callback(locale);
        });
    },
    
    // 移除语言变更监听器
    removeLanguageChangedListener: () => {
        ipcRenderer.removeAllListeners('language-changed');
    },
    
    // 发送窗口结果（用于同步等待）
    sendResult: (result) => {
        const windowId = new URLSearchParams(window.location.search).get('windowId');
        if (windowId) {
            ipcRenderer.send(`window-result-${windowId}`, result);
        }
    },
    
    // 原有的 API
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getVersion: () => ipcRenderer.invoke('get-version'),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});

// 在页面加载完成后初始化 i18n
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 获取当前语言
        const currentLocale = await window.electronAPI.getCurrentLocale();
        console.log('当前语言:', currentLocale);
        
        // 设置页面语言属性
        document.documentElement.lang = currentLocale;
        
        // 监听语言变更
        window.electronAPI.onLanguageChanged((newLocale) => {
            console.log('语言已更改为:', newLocale);
            document.documentElement.lang = newLocale;
            
            // 触发自定义事件，通知页面语言已更改
            window.dispatchEvent(new CustomEvent('language-changed', { 
                detail: { locale: newLocale } 
            }));
        });
        
    } catch (error) {
        console.error('初始化 i18n 失败:', error);
    }
});

// 提供全局翻译函数
window.t = async (key, fallback) => {
    try {
        return await window.electronAPI.t(key, fallback);
    } catch (error) {
        console.error('翻译失败:', error);
        return fallback || key;
    }
};

// 提供表单数据获取函数
window.getFormData = function() {
    const formData = {};
    
    // 获取所有表单
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const data = new FormData(form);
        for (let [key, value] of data.entries()) {
            formData[key] = value;
        }
    });
    
    // 也获取所有有 name 属性的输入元素
    const inputs = document.querySelectorAll('input[name], select[name], textarea[name]');
    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else {
            formData[input.name] = input.value;
        }
    });
    
    return formData;
};

console.log('🔗 Preload 脚本已加载，i18n 支持已启用');