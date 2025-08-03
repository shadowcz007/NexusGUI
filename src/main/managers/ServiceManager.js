const { AppStateService } = require('../services/AppStateService');
const { TrayService } = require('../services/TrayService');
const { ServerService } = require('../services/ServerService');
const { WindowService } = require('../services/WindowService');

/**
 * 服务管理器
 * 负责管理所有服务的初始化、启动、停止和依赖关系
 */
class ServiceManager {
    constructor() {
        this.services = new Map();
        this.isInitialized = false;
        this.isStarted = false;
        console.log('✅ 服务管理器已创建');
    }

    /**
     * 初始化所有服务
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ 服务管理器已初始化');
            return;
        }

        try {
            console.log('🔧 初始化服务管理器...');

            // 按依赖顺序初始化服务
            // 1. 应用状态服务（基础服务，无依赖）
            const appStateService = new AppStateService();
            this.services.set('appState', appStateService);

            // 2. 服务器服务（依赖应用状态服务）
            const serverService = new ServerService(appStateService);
            this.services.set('server', serverService);

            // 3. 窗口服务（依赖应用状态服务和服务器服务）
            const windowService = new WindowService(appStateService, serverService);
            this.services.set('window', windowService);

            // 4. 托盘服务（依赖应用状态服务和窗口服务）
            const trayService = new TrayService(appStateService, windowService);
            this.services.set('tray', trayService);

            this.isInitialized = true;
            console.log('✅ 服务管理器初始化完成');

        } catch (error) {
            console.error('❌ 服务管理器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 获取服务
     * @param {string} name - 服务名称
     * @returns {object} 服务实例
     */
    getService(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`服务不存在: ${name}`);
        }
        return service;
    }

    /**
     * 检查服务是否存在
     * @param {string} name - 服务名称
     * @returns {boolean} 服务是否存在
     */
    hasService(name) {
        return this.services.has(name);
    }

    /**
     * 启动所有服务
     * @returns {Promise<void>}
     */
    async startAll() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isStarted) {
            console.log('⚠️ 服务已启动');
            return;
        }

        try {
            console.log('🚀 启动所有服务...');

            // 按启动顺序启动服务
            // 1. 启动服务器
            console.log('🔧 启动服务器服务...');
            await this.getService('server').start();

            // 2. 创建托盘
            console.log('🔧 启动托盘服务...');
            this.getService('tray').create();

            // 窗口服务不需要启动，按需创建窗口

            this.isStarted = true;
            console.log('✅ 所有服务启动完成');

        } catch (error) {
            console.error('❌ 启动服务失败:', error);
            // 如果启动失败，尝试清理已启动的服务
            await this.stopAll();
            throw error;
        }
    }

    /**
     * 停止所有服务
     * @returns {Promise<void>}
     */
    async stopAll() {
        if (!this.isStarted) {
            console.log('⚠️ 服务未启动或已停止');
            return;
        }

        console.log('🛑 停止所有服务...');

        const stopPromises = [];

        try {
            // 按相反顺序停止服务
            // 1. 销毁托盘
            if (this.hasService('tray')) {
                console.log('🔧 停止托盘服务...');
                this.getService('tray').destroy();
            }

            // 2. 关闭所有窗口
            if (this.hasService('window')) {
                console.log('🔧 关闭所有窗口...');
                this.getService('window').closeAll();
            }

            // 3. 停止服务器
            if (this.hasService('server')) {
                console.log('🔧 停止服务器服务...');
                stopPromises.push(this.getService('server').stop());
            }

            // 4. 清理应用状态
            if (this.hasService('appState')) {
                console.log('🔧 清理应用状态服务...');
                this.getService('appState').cleanup();
            }

            await Promise.all(stopPromises);
            this.isStarted = false;
            console.log('✅ 所有服务已停止');

        } catch (error) {
            console.error('❌ 停止服务时出错:', error);
            // 即使出错也标记为已停止
            this.isStarted = false;
            throw error;
        }
    }

    /**
     * 重启特定服务
     * @param {string} serviceName - 服务名称
     * @param {...any} args - 重启参数
     * @returns {Promise<void>}
     */
    async restartService(serviceName, ...args) {
        const service = this.getService(serviceName);
        
        console.log(`🔄 重启服务: ${serviceName}`);

        if (service.restart) {
            await service.restart(...args);
        } else if (service.stop && service.start) {
            await service.stop();
            await service.start(...args);
        } else {
            throw new Error(`服务 ${serviceName} 不支持重启操作`);
        }

        console.log(`✅ 服务 ${serviceName} 重启完成`);
    }

    /**
     * 获取所有服务的状态
     * @returns {object} 服务状态信息
     */
    getServicesStatus() {
        const status = {
            initialized: this.isInitialized,
            started: this.isStarted,
            services: {}
        };

        this.services.forEach((service, name) => {
            status.services[name] = {
                exists: true,
                // 如果服务有状态方法，调用它
                status: service.getStatus ? service.getStatus() : 'unknown'
            };
        });

        return status;
    }

    /**
     * 检查服务管理器是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isServiceManagerInitialized() {
        return this.isInitialized;
    }

    /**
     * 检查服务是否已启动
     * @returns {boolean} 是否已启动
     */
    isServiceManagerStarted() {
        return this.isStarted;
    }

    /**
     * 获取服务数量
     * @returns {number} 服务数量
     */
    getServiceCount() {
        return this.services.size;
    }

    /**
     * 获取所有服务名称
     * @returns {string[]} 服务名称列表
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * 清理服务管理器
     * @returns {Promise<void>}
     */
    async cleanup() {
        console.log('🧹 清理服务管理器...');
        
        if (this.isStarted) {
            await this.stopAll();
        }

        this.services.clear();
        this.isInitialized = false;
        this.isStarted = false;

        console.log('✅ 服务管理器已清理');
    }
}

// 创建全局服务管理器实例
const serviceManager = new ServiceManager();

module.exports = { ServiceManager, serviceManager };