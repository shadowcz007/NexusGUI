const BaseToolHandler = require('./BaseToolHandler');
const notificationSchema = require('../schemas/notificationSchema');

/**
 * 通知工具
 * 负责发送定期通知流
 */
class NotificationTool extends BaseToolHandler {
    constructor() {
        super(
            'start-notification-stream',
            '开始发送定期通知'
        );
        
        // 存储活动的通知流
        this.activeStreams = new Map();
    }

    /**
     * 获取工具Schema
     * @returns {Object} Schema定义
     */
    getSchema() {
        return notificationSchema;
    }

    /**
     * 验证工具参数
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 调用基类验证
        super.validate(args);

        // 验证间隔时间
        if (args.interval !== undefined) {
            if (typeof args.interval !== 'number' || args.interval < 100 || args.interval > 60000) {
                throw new Error(`通知间隔 ${args.interval} 超出有效范围 (100-60000ms)`);
            }
        }

        // 验证通知数量
        if (args.count !== undefined) {
            if (typeof args.count !== 'number' || args.count < 1 || args.count > 100) {
                throw new Error(`通知数量 ${args.count} 超出有效范围 (1-100)`);
            }
        }

        // 验证通知级别
        if (args.level !== undefined) {
            const validLevels = ['info', 'warn', 'error', 'success'];
            if (!validLevels.includes(args.level)) {
                throw new Error(`无效的通知级别 ${args.level}，有效值: ${validLevels.join(', ')}`);
            }
        }

        return true;
    }

    /**
     * 执行通知流
     * @param {Object} args - 工具参数
     * @param {Object} server - MCP服务器实例
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args, server) {
        const {
            interval = 1000,
            count = 10,
            message = '通知 #{counter} - {timestamp}',
            level = 'info'
        } = args;

        try {
            this.log('info', `开始发送通知流`, {
                interval,
                count,
                level,
                messageTemplate: message
            });

            // 生成流ID
            const streamId = this.generateStreamId();
            
            // 启动通知流
            const streamPromise = this.startNotificationStream({
                streamId,
                interval,
                count,
                message,
                level,
                server
            });

            // 存储活动流
            this.activeStreams.set(streamId, {
                promise: streamPromise,
                startTime: Date.now(),
                interval,
                count,
                level
            });

            // 等待流完成
            const result = await streamPromise;

            // 清理完成的流
            this.activeStreams.delete(streamId);

            this.log('info', '通知流发送完成', { streamId, result });

            return {
                content: [{
                    type: 'text',
                    text: `✅ 已完成发送 ${count} 条通知，间隔 ${interval}ms\n📊 通知级别: ${level}\n🆔 流ID: ${streamId}`
                }],
                streamId,
                result
            };

        } catch (error) {
            this.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 启动通知流
     * @param {Object} config - 流配置
     * @returns {Promise<Object>} 流结果
     */
    async startNotificationStream(config) {
        const { streamId, interval, count, message, level, server } = config;
        
        let counter = 0;
        const results = [];
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            while (counter < count) {
                counter++;
                
                // 检查流是否被取消
                if (!this.activeStreams.has(streamId)) {
                    this.log('warn', '通知流被取消', { streamId, counter });
                    break;
                }

                await sleep(interval);

                // 格式化消息
                const formattedMessage = this.formatMessage(message, {
                    counter,
                    timestamp: new Date().toISOString(),
                    streamId,
                    level
                });

                try {
                    // 发送通知
                    if (server && typeof server.notification === 'function') {
                        await server.notification({
                            method: "notifications/message",
                            params: {
                                level: level,
                                data: formattedMessage
                            }
                        });

                        results.push({
                            counter,
                            message: formattedMessage,
                            timestamp: new Date().toISOString(),
                            success: true
                        });

                        this.log('info', `发送通知 #${counter}`, { 
                            streamId, 
                            message: formattedMessage 
                        });
                    } else {
                        throw new Error('服务器实例不可用或不支持通知');
                    }
                } catch (notificationError) {
                    this.log('error', `发送通知 #${counter} 失败`, { 
                        streamId, 
                        error: notificationError.message 
                    });
                    
                    results.push({
                        counter,
                        message: formattedMessage,
                        timestamp: new Date().toISOString(),
                        success: false,
                        error: notificationError.message
                    });
                }
            }

            return {
                streamId,
                totalSent: counter,
                results,
                completed: true
            };

        } catch (error) {
            this.log('error', '通知流执行失败', { streamId, error: error.message });
            throw error;
        }
    }

    /**
     * 格式化消息模板
     * @param {string} template - 消息模板
     * @param {Object} variables - 变量对象
     * @returns {string} 格式化后的消息
     */
    formatMessage(template, variables) {
        let formatted = template;
        
        // 替换占位符
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
        });

        return formatted;
    }

    /**
     * 生成流ID
     * @returns {string} 流ID
     */
    generateStreamId() {
        return `notification-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 停止指定的通知流
     * @param {string} streamId - 流ID
     * @returns {boolean} 是否成功停止
     */
    stopNotificationStream(streamId) {
        if (this.activeStreams.has(streamId)) {
            this.activeStreams.delete(streamId);
            this.log('info', '通知流已停止', { streamId });
            return true;
        }
        return false;
    }

    /**
     * 停止所有活动的通知流
     * @returns {number} 停止的流数量
     */
    stopAllNotificationStreams() {
        const count = this.activeStreams.size;
        this.activeStreams.clear();
        this.log('info', `已停止所有通知流`, { count });
        return count;
    }

    /**
     * 获取活动流信息
     * @returns {Array} 活动流信息数组
     */
    getActiveStreams() {
        return Array.from(this.activeStreams.entries()).map(([streamId, stream]) => ({
            streamId,
            startTime: stream.startTime,
            interval: stream.interval,
            count: stream.count,
            level: stream.level,
            duration: Date.now() - stream.startTime
        }));
    }

    /**
     * 工具初始化
     * @returns {Promise<void>}
     */
    async initialize() {
        this.log('info', '初始化通知工具');
        this.activeStreams.clear();
    }

    /**
     * 工具清理
     * @returns {Promise<void>}
     */
    async cleanup() {
        this.log('info', '清理通知工具');
        
        // 停止所有活动的通知流
        const stoppedCount = this.stopAllNotificationStreams();
        
        if (stoppedCount > 0) {
            this.log('info', `清理时停止了 ${stoppedCount} 个活动的通知流`);
        }
    }
}

module.exports = NotificationTool;