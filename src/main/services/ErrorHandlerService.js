/**
 * 统一错误处理服务
 * 提供错误分类、处理策略、恢复机制等功能
 */
class ErrorHandlerService {
    constructor(loggerService) {
        this.logger = loggerService.createModuleLogger('ERROR_HANDLER');
        this.errorHandlers = new Map();
        this.errorStats = new Map();
        this.recoveryStrategies = new Map();
        this.errorThresholds = new Map();
        
        // 注册默认错误处理器
        this.registerDefaultHandlers();
        
        this.logger.info('错误处理服务已初始化');
    }
    
    /**
     * 注册默认错误处理器
     */
    registerDefaultHandlers() {
        // 网络错误处理器
        this.registerHandler('NetworkError', async (error, context) => {
            this.logger.error('网络错误', { 
                message: error.message,
                url: context.url,
                method: context.method 
            });
            
            // 尝试重连策略
            if (context.retryCount < 3) {
                this.logger.info('尝试重新连接...', { retryCount: context.retryCount + 1 });
                return { shouldRetry: true, delay: Math.pow(2, context.retryCount) * 1000 };
            }
            
            return { shouldRetry: false, userMessage: '网络连接失败，请检查网络设置' };
        });
        
        // 文件系统错误处理器
        this.registerHandler('FileSystemError', async (error, context) => {
            this.logger.error('文件系统错误', {
                message: error.message,
                path: context.path,
                operation: context.operation
            });
            
            if (error.code === 'ENOENT') {
                return { 
                    shouldRetry: false, 
                    userMessage: `文件不存在: ${context.path}`,
                    suggestion: '请检查文件路径是否正确'
                };
            }
            
            if (error.code === 'EACCES') {
                return { 
                    shouldRetry: false, 
                    userMessage: '文件访问权限不足',
                    suggestion: '请检查文件权限设置'
                };
            }
            
            return { shouldRetry: false, userMessage: '文件操作失败' };
        });
        
        // 窗口错误处理器
        this.registerHandler('WindowError', async (error, context) => {
            this.logger.error('窗口错误', {
                message: error.message,
                windowId: context.windowId,
                operation: context.operation
            });
            
            // 如果窗口已销毁，尝试重新创建
            if (error.message.includes('destroyed')) {
                this.logger.info('检测到窗口已销毁，尝试重新创建');
                return { 
                    shouldRetry: true, 
                    action: 'recreateWindow',
                    windowConfig: context.windowConfig 
                };
            }
            
            return { shouldRetry: false, userMessage: '窗口操作失败' };
        });
        
        // 服务器错误处理器
        this.registerHandler('ServerError', async (error, context) => {
            this.logger.error('服务器错误', {
                message: error.message,
                port: context.port,
                service: context.service
            });
            
            // 端口占用错误
            if (error.code === 'EADDRINUSE') {
                this.logger.warn('端口被占用，尝试使用其他端口');
                return { 
                    shouldRetry: true, 
                    action: 'changePort',
                    suggestedPort: context.port + 1
                };
            }
            
            return { shouldRetry: false, userMessage: '服务器启动失败' };
        });
    }
    
    /**
     * 注册错误处理器
     * @param {string} errorType - 错误类型
     * @param {function} handler - 处理函数
     */
    registerHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
        this.errorStats.set(errorType, { count: 0, lastOccurred: null });
        this.logger.debug(`已注册错误处理器: ${errorType}`);
    }
    
    /**
     * 注册恢复策略
     * @param {string} errorType - 错误类型
     * @param {function} strategy - 恢复策略函数
     */
    registerRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
        this.logger.debug(`已注册恢复策略: ${errorType}`);
    }
    
    /**
     * 设置错误阈值
     * @param {string} errorType - 错误类型
     * @param {number} threshold - 阈值
     * @param {number} timeWindow - 时间窗口（毫秒）
     */
    setErrorThreshold(errorType, threshold, timeWindow = 60000) {
        this.errorThresholds.set(errorType, { threshold, timeWindow, occurrences: [] });
        this.logger.debug(`已设置错误阈值: ${errorType}, 阈值: ${threshold}, 时间窗口: ${timeWindow}ms`);
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {object} context - 上下文信息
     * @returns {Promise<object>} 处理结果
     */
    async handleError(error, context = {}) {
        const errorType = this.classifyError(error, context);
        
        // 更新错误统计
        this.updateErrorStats(errorType);
        
        // 检查错误阈值
        if (this.checkErrorThreshold(errorType)) {
            this.logger.warn(`错误类型 ${errorType} 超过阈值，触发特殊处理`);
            return await this.handleThresholdExceeded(errorType, error, context);
        }
        
        // 获取对应的错误处理器
        const handler = this.errorHandlers.get(errorType) || this.errorHandlers.get('Default');
        
        if (handler) {
            try {
                const result = await handler(error, context);
                
                // 如果需要重试，执行恢复策略
                if (result.shouldRetry) {
                    return await this.executeRecoveryStrategy(errorType, error, context, result);
                }
                
                return result;
            } catch (handlerError) {
                this.logger.error('错误处理器执行失败', {
                    originalError: error.message,
                    handlerError: handlerError.message,
                    errorType
                });
                
                return this.defaultErrorHandler(error, context);
            }
        }
        
        return this.defaultErrorHandler(error, context);
    }
    
    /**
     * 错误分类
     * @param {Error} error - 错误对象
     * @param {object} context - 上下文信息
     * @returns {string} 错误类型
     */
    classifyError(error, context) {
        // 根据错误消息和上下文分类
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return 'NetworkError';
        }
        
        if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EISDIR') {
            return 'FileSystemError';
        }
        
        if (error.code === 'EADDRINUSE') {
            return 'ServerError';
        }
        
        if (error.message.includes('window') || error.message.includes('destroyed')) {
            return 'WindowError';
        }
        
        if (context.module) {
            return `${context.module}Error`;
        }
        
        return 'UnknownError';
    }
    
    /**
     * 更新错误统计
     * @param {string} errorType - 错误类型
     */
    updateErrorStats(errorType) {
        const stats = this.errorStats.get(errorType) || { count: 0, lastOccurred: null };
        stats.count++;
        stats.lastOccurred = new Date();
        this.errorStats.set(errorType, stats);
        
        // 更新阈值检查
        const threshold = this.errorThresholds.get(errorType);
        if (threshold) {
            const now = Date.now();
            threshold.occurrences.push(now);
            
            // 清理过期的记录
            threshold.occurrences = threshold.occurrences.filter(
                time => now - time <= threshold.timeWindow
            );
        }
    }
    
    /**
     * 检查错误阈值
     * @param {string} errorType - 错误类型
     * @returns {boolean} 是否超过阈值
     */
    checkErrorThreshold(errorType) {
        const threshold = this.errorThresholds.get(errorType);
        if (!threshold) return false;
        
        return threshold.occurrences.length >= threshold.threshold;
    }
    
    /**
     * 处理阈值超过的情况
     * @param {string} errorType - 错误类型
     * @param {Error} error - 错误对象
     * @param {object} context - 上下文信息
     * @returns {Promise<object>} 处理结果
     */
    async handleThresholdExceeded(errorType, error, context) {
        this.logger.error(`错误类型 ${errorType} 频繁发生，可能存在系统性问题`, {
            errorCount: this.errorStats.get(errorType).count,
            recentOccurrences: this.errorThresholds.get(errorType).occurrences.length
        });
        
        // 可以在这里实现特殊的处理逻辑，比如：
        // 1. 发送告警通知
        // 2. 暂时禁用相关功能
        // 3. 触发系统自检
        // 4. 记录详细的诊断信息
        
        return {
            shouldRetry: false,
            userMessage: '系统检测到频繁错误，请联系技术支持',
            severity: 'critical',
            requiresAttention: true
        };
    }
    
    /**
     * 执行恢复策略
     * @param {string} errorType - 错误类型
     * @param {Error} error - 错误对象
     * @param {object} context - 上下文信息
     * @param {object} handlerResult - 处理器结果
     * @returns {Promise<object>} 恢复结果
     */
    async executeRecoveryStrategy(errorType, error, context, handlerResult) {
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (strategy) {
            try {
                this.logger.info(`执行恢复策略: ${errorType}`);
                
                if (handlerResult.delay) {
                    await this.delay(handlerResult.delay);
                }
                
                const recoveryResult = await strategy(error, context, handlerResult);
                
                if (recoveryResult.success) {
                    this.logger.info(`恢复策略执行成功: ${errorType}`);
                    return { recovered: true, ...recoveryResult };
                } else {
                    this.logger.warn(`恢复策略执行失败: ${errorType}`, { 
                        reason: recoveryResult.reason 
                    });
                    return { recovered: false, ...recoveryResult };
                }
            } catch (strategyError) {
                this.logger.error('恢复策略执行异常', {
                    errorType,
                    strategyError: strategyError.message
                });
                return { recovered: false, error: strategyError.message };
            }
        }
        
        return handlerResult;
    }
    
    /**
     * 默认错误处理器
     * @param {Error} error - 错误对象
     * @param {object} context - 上下文信息
     * @returns {object} 处理结果
     */
    defaultErrorHandler(error, context) {
        this.logger.error('未分类错误', {
            message: error.message,
            stack: error.stack,
            context
        });
        
        return {
            shouldRetry: false,
            userMessage: '系统发生未知错误，请稍后重试',
            technicalDetails: error.message
        };
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取错误统计信息
     * @returns {object} 统计信息
     */
    getErrorStats() {
        const stats = {};
        for (const [errorType, data] of this.errorStats) {
            stats[errorType] = { ...data };
        }
        return stats;
    }
    
    /**
     * 清理错误统计
     */
    clearErrorStats() {
        this.errorStats.clear();
        this.errorThresholds.forEach(threshold => {
            threshold.occurrences = [];
        });
        this.logger.info('错误统计已清理');
    }
    
    /**
     * 获取健康状态
     * @returns {object} 健康状态信息
     */
    getHealthStatus() {
        const totalErrors = Array.from(this.errorStats.values())
            .reduce((sum, stat) => sum + stat.count, 0);
        
        const criticalErrors = Array.from(this.errorStats.entries())
            .filter(([type, stat]) => {
                const threshold = this.errorThresholds.get(type);
                return threshold && threshold.occurrences.length >= threshold.threshold;
            });
        
        return {
            totalErrors,
            errorTypes: this.errorStats.size,
            criticalErrors: criticalErrors.length,
            registeredHandlers: this.errorHandlers.size,
            registeredStrategies: this.recoveryStrategies.size,
            status: criticalErrors.length > 0 ? 'critical' : 
                   totalErrors > 10 ? 'warning' : 'healthy'
        };
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        this.logger.info('错误处理服务正在清理...');
        this.errorHandlers.clear();
        this.errorStats.clear();
        this.recoveryStrategies.clear();
        this.errorThresholds.clear();
    }
}

module.exports = { ErrorHandlerService };