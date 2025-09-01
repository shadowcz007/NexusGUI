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

    // 发送消息到主进程
    send: (channel, data) => {
        // 定义允许的通道列表
        let validChannels = ['startup-wizard-complete', 'open-dev-tools', 'toggle-window-pin'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    // 在文件管理器中显示文件
    showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),

    // MCP 工具相关 API
    getAvailableTools: () => ipcRenderer.invoke('get-available-tools'),
    executeMCPTool: (toolName, params) => ipcRenderer.invoke('execute-mcp-tool', toolName, params),

    // 设置相关 API
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    resetSettings: () => ipcRenderer.invoke('reset-settings'),

    // MCP 服务器控制
    startMCPServer: () => ipcRenderer.invoke('start-mcp-server'),
    stopMCPServer: () => ipcRenderer.invoke('stop-mcp-server'),
    restartMCPServer: () => ipcRenderer.invoke('restart-mcp-server'),
    getMCPServerStatus: () => ipcRenderer.invoke('get-mcp-server-status'),
    saveMCPConfig: (config) => ipcRenderer.invoke('save-mcp-config', config),

    // MCP 配置文件
    getMCPDefaultConfig: () => ipcRenderer.invoke('get-mcp-default-config'),
    getMCPUserConfig: () => ipcRenderer.invoke('get-mcp-user-config'),
    getMCPExampleConfig: () => ipcRenderer.invoke('get-mcp-example-config'),

    // 通用 invoke 方法（用于向后兼容）
    invoke: (channel, ...args) => {
        // 定义允许的通道列表
        const validChannels = [
            'save-settings',
            'reset-settings',
            'get-available-tools',
            'execute-mcp-tool',
            'open-external',
            'get-version',
            'show-message-box',
            'get-current-locale',
            'set-locale',
            'get-translation',
            'get-supported-locales',
            'show-item-in-folder',
            'start-mcp-server',
            'stop-mcp-server',
            'restart-mcp-server',
            'get-mcp-server-status',
            'save-mcp-config',
            'get-mcp-default-config',
            'get-mcp-user-config',
            'get-mcp-example-config'
        ];

        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        } else {
            throw new Error(`Invalid channel: ${channel}`);
        }
    },

    // 原有的 API
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getVersion: () => ipcRenderer.invoke('get-version'),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});

// 在页面加载完成后初始化 i18n
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async() => {

        try {
            // 检查 electronAPI 是否可用
            if (!window.electronAPI || typeof window.electronAPI.getCurrentLocale !== 'function') {
                console.error('electronAPI 不可用或 getCurrentLocale 方法不存在');
                console.log(window.electronAPI);
                return;
            }
            console.log('electronAPI 可用');

            // 获取当前语言，添加超时处理
            const currentLocale = await Promise.race([
                window.electronAPI.getCurrentLocale(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('获取语言超时')), 5000)
                )
            ]);

            console.log('当前语言:', currentLocale);

            // 设置页面语言属性
            if (currentLocale) {
                document.documentElement.lang = currentLocale;
            }

            // 监听语言变更
            if (typeof window.electronAPI.onLanguageChanged === 'function') {
                window.electronAPI.onLanguageChanged((newLocale) => {
                    console.log('语言已更改为:', newLocale);
                    document.documentElement.lang = newLocale;

                    // 触发自定义事件，通知页面语言已更改
                    window.dispatchEvent(new CustomEvent('language-changed', {
                        detail: { locale: newLocale }
                    }));
                });
            }

        } catch (error) {
            console.error('初始化 i18n 失败:', error);
            // 设置默认语言
            document.documentElement.lang = 'en-US';
        }

    }, 5000)
});

// 提供全局翻译函数
window.t = async(key, fallback) => {
    try {
        // 检查 electronAPI 是否可用
        if (!window.electronAPI || typeof window.electronAPI.t !== 'function') {
            console.warn('electronAPI.t 不可用，返回后备文本');
            return fallback || key;
        }

        // 添加超时处理
        const translation = await Promise.race([
            window.electronAPI.t(key, fallback),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('翻译请求超时')), 3000)
            )
        ]);

        return translation;
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