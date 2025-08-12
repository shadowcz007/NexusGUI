const { AppStateService } = require('../services/AppStateService');
const { ServerService } = require('../services/ServerService');
const { TrayService } = require('../services/TrayService');
const { WindowService } = require('../services/WindowService');
const { LoggerService } = require('../services/LoggerService');
const { ErrorHandlerService } = require('../services/ErrorHandlerService');
const { SystemMonitorService } = require('../services/SystemMonitorService');

/**
 * 服务管理器
 * 负责管理所有服务的初始化、启动、停止和依赖关系
 */
class ServiceManager {
    constructor() {
        this.services = new Map();
        this.initialized = false;
        this.starting = false;
        
        // 首先初始化日志服务
        this.logger = new LoggerService({
            level: process.argv.includes('--debug') ? 'DEBUG' : 'INFO',
            enableFileLogging: true
        });
        
        // 初始化错误处理服务
        this.errorHandler = new ErrorHandlerService(this.logger);
        
        this.logger.info('服务管理器已创建', {}, 'SERVICE_MANAGER');
    }

    /**
     * 初始化所有服务
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            this.logger.warn('服务管理器已初始化，跳过重复初始化', {}, 'SERVICE_MANAGER');
            return;
        }

        this.logger.info('正在初始化服务管理器...', {}, 'SERVICE_MANAGER');

        try {
            // 注册日志和错误处理服务
            this.services.set('logger', this.logger);
            this.services.set('errorHandler', this.errorHandler);

            // 创建应用状态服务
            const appStateService = new AppStateService(this.logger, this.errorHandler);
            this.services.set('appState', appStateService);

            // 创建服务器服务
            const serverService = new ServerService(appStateService, this.logger, this.errorHandler);
            this.services.set('server', serverService);

            // 创建窗口服务
            const windowService = new WindowService(appStateService, serverService, this.logger, this.errorHandler);
            this.services.set('window', windowService);

            // 创建托盘服务
            const trayService = new TrayService(appStateService, windowService, this.logger, this.errorHandler);
            this.services.set('tray', trayService);

            // 创建系统监控服务
            const systemMonitorService = new SystemMonitorService();
            this.services.set('systemMonitor', systemMonitorService);

            this.initialized = true;
            this.logger.info('服务管理器初始化完成', {}, 'SERVICE_MANAGER');

        } catch (error) {
            await this.errorHandler.handleError(error, { 
                module: 'SERVICE_MANAGER', 
                operation: 'initialize' 
            });
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
            const error = new Error(`服务不存在: ${name}`);
            this.logger.error('获取服务失败', { serviceName: name }, 'SERVICE_MANAGER');
            throw error;
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
        if (this.starting) {
            this.logger.warn('服务正在启动中，请稍候...', {}, 'SERVICE_MANAGER');
            return;
        }

        this.starting = true;
        this.logger.info('正在启动所有服务...', {}, 'SERVICE_MANAGER');

        try {
            // 确保服务管理器已初始化
            if (!this.initialized) {
                await this.initialize();
            }

            // 启动服务器服务
            const serverService = this.getService('server');
            await serverService.start();

            // 创建托盘
            const trayService = this.getService('tray');
            await trayService.createTray();

            this.logger.info('所有服务启动完成', {}, 'SERVICE_MANAGER');

        } catch (error) {
            await this.errorHandler.handleError(error, { 
                module: 'SERVICE_MANAGER', 
                operation: 'startAll' 
            });
            throw error;
        } finally {
            this.starting = false;
        }
    }

    /**
     * 停止所有服务
     * @returns {Promise<void>}
     */
    async stopAll() {
        this.logger.info('正在停止所有服务...', {}, 'SERVICE_MANAGER');

        try {
            // 按相反顺序停止服务
            // 1. 销毁托盘
            if (this.hasService('tray')) {
                this.logger.debug('停止托盘服务...', {}, 'SERVICE_MANAGER');
                this.getService('tray').destroy();
            }

            // 2. 关闭所有窗口
            if (this.hasService('window')) {
                this.logger.debug('关闭所有窗口...', {}, 'SERVICE_MANAGER');
                this.getService('window').closeAll();
            }

            // 3. 停止服务器
            if (this.hasService('server')) {
                this.logger.debug('停止服务器服务...', {}, 'SERVICE_MANAGER');
                await this.getService('server').stop();
            }

            // 4. 清理应用状态
            if (this.hasService('appState')) {
                this.logger.debug('清理应用状态服务...', {}, 'SERVICE_MANAGER');
                this.getService('appState').cleanup();
            }

            // 5. 清理日志和错误处理服务
            if (this.logger) {
                this.logger.cleanup();
            }
            if (this.errorHandler) {
                this.errorHandler.cleanup();
            }

            this.logger.info('所有服务已停止', {}, 'SERVICE_MANAGER');

        } catch (error) {
            await this.errorHandler.handleError(error, { 
                module: 'SERVICE_MANAGER', 
                operation: 'stopAll' 
            });
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
        try {
            const service = this.getService(serviceName);
            
            this.logger.info(`重启服务: ${serviceName}`, { args }, 'SERVICE_MANAGER');

            if (service.restart) {
                await service.restart(...args);
            } else if (service.stop && service.start) {
                await service.stop();
                await service.start(...args);
            } else {
                throw new Error(`服务 ${serviceName} 不支持重启操作`);
            }

            this.logger.info(`服务 ${serviceName} 重启完成`, {}, 'SERVICE_MANAGER');
        } catch (error) {
            await this.errorHandler.handleError(error, { 
                module: 'SERVICE_MANAGER', 
                operation: 'restartService',
                serviceName 
            });
            throw error;
        }
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
        return this.initialized;
    }

    /**
     * 检查服务是否已启动
     * @returns {boolean} 是否已启动
     */
    isServiceManagerStarted() {
        return !this.starting;
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
        this.logger.info('清理服务管理器...', {}, 'SERVICE_MANAGER');
        
        try {
            await this.stopAll();
            
            this.services.clear();
            this.initialized = false;
            this.starting = false;

            this.logger.info('服务管理器已清理', {}, 'SERVICE_MANAGER');
        } catch (error) {
            await this.errorHandler.handleError(error, { 
                module: 'SERVICE_MANAGER', 
                operation: 'cleanup' 
            });
            throw error;
        }
    }
}

// 创建全局服务管理器实例
const serviceManager = new ServiceManager();

module.exports = { ServiceManager, serviceManager };