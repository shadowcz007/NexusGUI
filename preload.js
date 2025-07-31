const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 监听来自主进程的消息
    on: (channel, callback) => {
        const validChannels = ['render-dynamic-gui'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },

    // 发送消息到主进程
    send: (channel, data) => {
        const validChannels = ['mcp-result'];
        if (validChannels.includes(channel)) {
            ipcRenderer.invoke(channel, data);
        }
    },

    // 获取表单数据
    getFormData: (formSelector) => {
        return ipcRenderer.invoke('get-form-data', formSelector);
    },

    // 移除监听器
    removeAllListeners: (channel) => {
        const validChannels = ['render-dynamic-gui'];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    }
});

console.log('🔌 Preload 脚本已加载');