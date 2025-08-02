/**
 * 基础工具处理器
 * 所有MCP工具的基类，定义了工具的基本接口和通用功能
 */
class BaseToolHandler {
    /**
     * 构造函数
     * @param {string} name - 工具名称
     * @param {string} description - 工具描述
     */
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    /**
     * 获取工具的输入Schema
     * 子类必须实现此方法
     * @returns {Object} JSON Schema对象
     */
    getSchema() {
        throw new Error(`工具 ${this.name} 必须实现 getSchema 方法`);
    }

    /**
     * 执行工具逻辑
     * 子类必须实现此方法
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async execute(args) {
        throw new Error(`工具 ${this.name} 必须实现 execute 方法`);
    }

    /**
     * 验证工具参数
     * 子类可以重写此方法实现自定义验证
     * @param {Object} args - 工具参数
     * @returns {boolean} 验证结果
     */
    validate(args) {
        // 基础验证：检查必需参数
        const schema = this.getSchema();
        if (schema.required) {
            for (const requiredField of schema.required) {
                if (!(requiredField in args)) {
                    throw new Error(`缺少必需参数: ${requiredField}`);
                }
            }
        }
        return true;
    }

    /**
     * 获取工具的完整定义
     * @returns {Object} 工具定义对象
     */
    getDefinition() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: this.getSchema()
        };
    }

    /**
     * 记录工具执行日志
     * @param {string} level - 日志级别 (info, warn, error)
     * @param {string} message - 日志消息
     * @param {Object} data - 附加数据
     */
    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            tool: this.name,
            level,
            message,
            ...data
        };
        
        switch (level) {
            case 'error':
                console.error(`❌ [${timestamp}] ${this.name}:`, message, data);
                break;
            case 'warn':
                console.warn(`⚠️ [${timestamp}] ${this.name}:`, message, data);
                break;
            default:
                console.log(`ℹ️ [${timestamp}] ${this.name}:`, message, data);
        }
    }

    /**
     * 处理工具执行错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @throws {Error} 格式化后的错误
     */
    handleError(error, context = {}) {
        this.log('error', `工具执行失败: ${error.message}`, {
            error: error.stack,
            context
        });
        
        throw new Error(`工具 ${this.name} 执行失败: ${error.message}`);
    }
}

module.exports = BaseToolHandler;