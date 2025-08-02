/**
 * 工具注册器
 * 管理所有MCP工具的注册、查找和执行
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.initialized = false;
    }

    /**
     * 注册工具
     * @param {BaseToolHandler} toolHandler - 工具处理器实例
     */
    register(toolHandler) {
        if (!toolHandler.name) {
            throw new Error('工具必须有名称');
        }

        if (this.tools.has(toolHandler.name)) {
            console.warn(`⚠️ 工具 ${toolHandler.name} 已存在，将被覆盖`);
        }

        this.tools.set(toolHandler.name, toolHandler);
        console.log(`✅ 已注册工具: ${toolHandler.name}`);
    }

    /**
     * 批量注册工具
     * @param {BaseToolHandler[]} toolHandlers - 工具处理器数组
     */
    registerAll(toolHandlers) {
        for (const toolHandler of toolHandlers) {
            this.register(toolHandler);
        }
    }

    /**
     * 获取工具
     * @param {string} name - 工具名称
     * @returns {BaseToolHandler|null} 工具处理器
     */
    getTool(name) {
        return this.tools.get(name) || null;
    }

    /**
     * 获取所有工具名称
     * @returns {string[]} 工具名称数组
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }

    /**
     * 获取所有工具的Schema定义
     * @returns {Object[]} 工具Schema数组
     */
    getToolSchemas() {
        return Array.from(this.tools.values()).map(tool => tool.getDefinition());
    }

    /**
     * 检查工具是否存在
     * @param {string} name - 工具名称
     * @returns {boolean} 是否存在
     */
    hasTool(name) {
        return this.tools.has(name);
    }

    /**
     * 执行工具
     * @param {string} name - 工具名称
     * @param {Object} args - 工具参数
     * @returns {Promise<Object>} 执行结果
     */
    async executeTool(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`未知工具: ${name}`);
        }

        try {
            // 记录工具调用
            tool.log('info', '开始执行工具', { args });

            // 验证参数
            tool.validate(args);

            // 执行工具
            const startTime = Date.now();
            const result = await tool.execute(args);
            const duration = Date.now() - startTime;

            // 记录执行结果
            tool.log('info', '工具执行完成', { 
                duration: `${duration}ms`,
                resultType: typeof result
            });

            return result;
        } catch (error) {
            tool.handleError(error, { args });
            throw error;
        }
    }

    /**
     * 获取工具统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalTools: this.tools.size,
            toolNames: this.getToolNames(),
            initialized: this.initialized
        };
    }

    /**
     * 初始化所有工具
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        console.log(`🔧 正在初始化 ${this.tools.size} 个工具...`);

        for (const [name, tool] of this.tools) {
            try {
                // 如果工具有初始化方法，则调用
                if (typeof tool.initialize === 'function') {
                    await tool.initialize();
                }
                console.log(`✅ 工具 ${name} 初始化完成`);
            } catch (error) {
                console.error(`❌ 工具 ${name} 初始化失败:`, error);
                throw error;
            }
        }

        this.initialized = true;
        console.log(`🎉 所有工具初始化完成`);
    }

    /**
     * 清理所有工具
     * @returns {Promise<void>}
     */
    async cleanup() {
        console.log(`🧹 正在清理 ${this.tools.size} 个工具...`);

        for (const [name, tool] of this.tools) {
            try {
                // 如果工具有清理方法，则调用
                if (typeof tool.cleanup === 'function') {
                    await tool.cleanup();
                }
                console.log(`✅ 工具 ${name} 清理完成`);
            } catch (error) {
                console.error(`❌ 工具 ${name} 清理失败:`, error);
            }
        }

        this.tools.clear();
        this.initialized = false;
        console.log(`🎉 所有工具清理完成`);
    }
}

module.exports = ToolRegistry;