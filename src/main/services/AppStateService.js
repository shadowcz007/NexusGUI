/**
 * 应用状态服务
 * 负责管理应用的全局状态和状态变化监听
 */
class AppStateService {
    constructor() {
        this.state = {
            mcpServerInfo: {
                status: 'stopped',
                port: null,
                endpoints: [],
                error: null,
                startTime: null,
                serverName: 'nexusgui-sse-server',
                version: '0.1.0'
            },
            windows: new Map(), // 存储所有窗口
            isShuttingDown: false
        };
        
        this.listeners = new Map(); // 状态变化监听器
        console.log('✅ 应用状态服务已初始化');
    }

    /**
     * 获取状态
     * @param {string} key - 状态键名，不传则返回全部状态
     * @returns {any} 状态值
     */
    getState(key) {
        return key ? this.state[key] : this.state;
    }

    /**
     * 更新状态
     * @param {string} key - 状态键名
     * @param {any} value - 新的状态值
     */
    updateState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notifyListeners(key, value, oldValue);
    }

    /**
     * 更新服务器信息
     * @param {object} info - 服务器信息对象
     */
    updateServerInfo(info) {
        const oldInfo = { ...this.state.mcpServerInfo };
        this.state.mcpServerInfo = { ...this.state.mcpServerInfo, ...info };
        this.notifyListeners('mcpServerInfo', this.state.mcpServerInfo, oldInfo);
    }

    /**
     * 添加状态监听器
     * @param {string} key - 要监听的状态键名
     * @param {function} callback - 回调函数
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    /**
     * 移除状态监听器
     * @param {string} key - 状态键名
     * @param {function} callback - 要移除的回调函数
     */
    removeListener(key, callback) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 通知监听器状态变化
     * @param {string} key - 状态键名
     * @param {any} newValue - 新值
     * @param {any} oldValue - 旧值
     */
    notifyListeners(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error(`状态监听器执行错误 [${key}]:`, error);
            }
        });
    }

    /**
     * 添加窗口到状态管理
     * @param {string} id - 窗口ID
     * @param {BrowserWindow} window - 窗口对象
     */
    addWindow(id, window) {
        this.state.windows.set(id, window);
        console.log(`📱 窗口已添加到状态管理: ${id}`);
    }

    /**
     * 从状态管理中移除窗口
     * @param {string} id - 窗口ID
     */
    removeWindow(id) {
        if (this.state.windows.delete(id)) {
            console.log(`📱 窗口已从状态管理中移除: ${id}`);
        }
    }

    /**
     * 获取窗口
     * @param {string} id - 窗口ID
     * @returns {BrowserWindow|null} 窗口对象
     */
    getWindow(id) {
        return this.state.windows.get(id) || null;
    }

    /**
     * 获取所有窗口
     * @returns {Map} 窗口映射
     */
    getAllWindows() {
        return new Map(this.state.windows);
    }

    /**
     * 清理状态
     */
    cleanup() {
        console.log('🧹 清理应用状态服务...');
        this.state.isShuttingDown = true;
        this.listeners.clear();
        this.state.windows.clear();
        console.log('✅ 应用状态服务已清理');
    }
}

module.exports = { AppStateService };