/**
 * 工具模块导出文件
 * 统一管理所有MCP工具的导入和导出
 */

// 导入基础类
const BaseToolHandler = require('./BaseToolHandler');
const ToolRegistry = require('./ToolRegistry');

// 导入具体工具实现
const RenderGUITool = require('./RenderGUITool');
const InjectJSTool = require('./InjectJSTool');
const NotificationTool = require('./NotificationTool');

// 导入工具类
const { HtmlUtils, WindowConfigValidator } = require('../utils/htmlUtils');

/**
 * 创建默认工具注册器
 * @returns {ToolRegistry} 配置好的工具注册器实例
 */
function createDefaultToolRegistry() {
    const registry = new ToolRegistry();
    
    // 注册所有默认工具
    registry.register(new RenderGUITool());
    registry.register(new InjectJSTool());
    registry.register(new NotificationTool());
    
    return registry;
}

/**
 * 获取所有可用工具类
 * @returns {Object} 工具类映射
 */
function getAllToolClasses() {
    return {
        BaseToolHandler,
        RenderGUITool,
        InjectJSTool,
        NotificationTool
    };
}

/**
 * 获取所有工具名称
 * @returns {string[]} 工具名称数组
 */
function getAllToolNames() {
    return [
        'render-gui',
        'inject-js',
        'start-notification-stream'
    ];
}

// 导出所有内容
module.exports = {
    // 基础类
    BaseToolHandler,
    ToolRegistry,
    
    // 具体工具
    RenderGUITool,
    InjectJSTool,
    NotificationTool,
    
    // 工具类
    HtmlUtils,
    WindowConfigValidator,
    
    // 便捷函数
    createDefaultToolRegistry,
    getAllToolClasses,
    getAllToolNames
};