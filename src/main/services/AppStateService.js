/**
 * 应用状态服务
 * 负责管理应用的全局状态和状态变化监听
 */
class AppStateService {
    constructor(loggerService, errorHandlerService) {
        this.logger = loggerService.createModuleLogger('APP_STATE');
        this.errorHandler = errorHandlerService;
        
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
            // 网络状态信息
            networkStatus: {
                connected: false,
                activeSessions: 0,
                lastActivity: null,
                totalSessions: 0
            },
            windows: new Map(), // 存储所有窗口
            // 存储最近渲染的界面历史记录（最多保存10个）
            renderHistory: [],
            isShuttingDown: false
        };
        
        this.listeners = new Map(); // 状态变化监听器
        this.logger.info('应用状态服务已初始化');
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
     * 设置状态
     * @param {string} key - 状态键名
     * @param {any} value - 状态值
     */
    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notifyListeners(key, value, oldValue);
    }

    /**
     * 更新服务器信息
     * @param {object} serverInfo - 服务器信息
     */
    updateServerInfo(serverInfo) {
        const oldValue = { ...this.state.mcpServerInfo };
        this.state.mcpServerInfo = { ...this.state.mcpServerInfo, ...serverInfo };
        this.notifyListeners('mcpServerInfo', this.state.mcpServerInfo, oldValue);
    }

    /**
     * 更新网络状态
     * @param {object} networkStatus - 网络状态信息
     */
    updateNetworkStatus(networkStatus) {
        const oldValue = { ...this.state.networkStatus };
        this.state.networkStatus = { ...this.state.networkStatus, ...networkStatus };
        this.notifyListeners('networkStatus', this.state.networkStatus, oldValue);
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
        const listeners = this.listeners.get(key) || [];
        listeners.forEach(listener => {
            try {
                listener(newValue, oldValue);
            } catch (error) {
                this.errorHandler.handleError(error, {
                    module: 'APP_STATE',
                    operation: 'notifyListeners',
                    key
                });
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
        this.logger.debug(`窗口已添加到状态管理: ${id}`);
    }

    /**
     * 从状态管理中移除窗口
     * @param {string} id - 窗口ID
     */
    removeWindow(id) {
        if (this.state.windows.delete(id)) {
            this.logger.debug(`窗口已从状态管理中移除: ${id}`);
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
     * 添加渲染历史记录
     * @param {Object} guiData - GUI数据
     */
    addRenderHistory(guiData) {
        try {
            // 获取历史记录配置
            const saveHtmlContent = global.settingsManager?.getSetting('history.saveHtmlContent') !== false;
            const maxHistoryItems = global.settingsManager?.getSetting('history.maxHistoryItems') || 10;
            
            // 创建历史记录条目
            const historyEntry = {
                id: Date.now().toString(),
                title: guiData.config?.title || '未命名界面',
                timestamp: new Date().toISOString(),
                config: {
                    title: guiData.config?.title,
                    width: guiData.config?.width,
                    height: guiData.config?.height,
                    data: guiData.config?.data,
                    callbacks: guiData.config?.callbacks
                },
                hasHtml: !!guiData.html,
                // 保存类型和 URL 信息，用于正确的历史记录渲染
                type: guiData.type || 'html',
                originalType: guiData.originalType,
                subType: guiData.subType,
                url: guiData.url,
                directUrl: guiData.directUrl
            };

            // 根据配置决定是否保存HTML内容
            if (saveHtmlContent && guiData.html) {
                historyEntry.html = guiData.html;
            }

            // 添加到历史记录数组开头
            this.state.renderHistory.unshift(historyEntry);

            // 限制历史记录数量
            if (this.state.renderHistory.length > maxHistoryItems) {
                this.state.renderHistory = this.state.renderHistory.slice(0, maxHistoryItems);
            }

            this.logger.debug(`渲染历史记录已更新，当前数量: ${this.state.renderHistory.length}`);
        } catch (error) {
            this.logger.error('添加渲染历史记录失败', { error: error.message });
        }
    }

    /**
     * 获取渲染历史记录
     * @returns {Array} 历史记录数组
     */
    getRenderHistory() {
        return [...this.state.renderHistory];
    }

    /**
     * 根据ID获取历史记录项
     * @param {string} id - 历史记录ID
     * @returns {Object|null} 历史记录项
     */
    getRenderHistoryItem(id) {
        return this.state.renderHistory.find(item => item.id === id) || null;
    }

    /**
     * 清理状态
     */
    cleanup() {
        this.logger.info('清理应用状态服务...');
        this.state.isShuttingDown = true;
        this.state.windows.clear();
        this.state.renderHistory = [];
        this.listeners.clear();
        this.logger.info('应用状态服务已清理');
    }
}

module.exports = { AppStateService };