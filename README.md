# NexusGUI

[English](./README_EN.md) | 中文

通过 MCP 传递 GUI 定义，实现 AI 生成界面，桌面端渲染

## 🎥 演示视频

观看完整功能演示：[NexusGUI Demo Video](https://youtu.be/8ubN6-mrO_A?si=dNy2Wv3-kXNt_ZN0)

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动应用
```bash
# 系统托盘模式启动（推荐）
npm start

# 或带主窗口启动
npm run start-with-window
```

### 使用 MCP 工具
启动后，应用会在 `http://localhost:3001` 启动 MCP 服务器，你可以通过以下方式使用：

1. **连接到 MCP 服务器**: `http://localhost:3001/mcp`
2. **调用 render-gui 工具**:
```javascript
{
  "title": "我的第一个界面",
  "width": 600,
  "height": 400,
  "html": "<div style='padding: 20px; text-align: center;'><h1>Hello NexusGUI!</h1><p>这是我的第一个动态界面</p></div>"
}
```

## 🆕 最新功能

### 系统托盘集成 🆕
- ✅ 支持系统托盘模式运行，无需保持主窗口
- ✅ 右击托盘图标访问MCP服务器控制台和调试功能
- ✅ 实时显示服务器状态、端口和活动会话信息
- ✅ 集成健康检查、调试信息、会话管理等工具
- ✅ 支持服务器设置和配置管理
- ✅ 跨平台支持（macOS、Windows、Linux）

### HTML 直接渲染模式 🆕
- ✅ 支持直接传入 HTML 字符串进行界面渲染
- ✅ 支持 HTML 文件路径渲染（优先使用 HTML 字符串）
- ✅ 完全自定义的界面布局和样式
- ✅ 支持 JavaScript 事件处理和交互
- ✅ 内置 `electronAPI.sendResult()` 函数用于同步等待结果

### 窗口复用功能 🆕
- ✅ 支持复用现有窗口而不是销毁重建
- ✅ 通过 `reuseWindow` 参数控制窗口复用行为
- ✅ 保持窗口状态和位置，提升用户体验
- ✅ 减少资源消耗，提高性能

### 同步等待结果 🆕
- ✅ 支持 `waitForResult` 参数同步等待窗口操作结果
- ✅ 窗口关闭或提交结果时返回数据
- ✅ 适用于需要用户输入确认的场景

### 窗口属性设置
- ✅ 支持丰富的窗口属性配置（菜单栏、边框、透明度、全屏等）
- ✅ 支持窗口尺寸限制（最小/最大宽高）
- ✅ 支持窗口行为控制（置顶、任务栏显示、可调整大小等）
- ✅ 支持窗口外观设置（透明度、缩放因子、全屏模式）

## 🆕 重构后的架构

### 模块化工具系统 🆕
- ✅ **面向对象设计**: 采用基于类的工具架构，提高代码可维护性
- ✅ **工具注册器**: 统一管理所有MCP工具的注册、查找和执行
- ✅ **插件化扩展**: 新工具只需继承基类并注册，支持热插拔
- ✅ **Schema分离**: 工具定义与实现分离，便于维护和扩展
- ✅ **单元测试**: 每个工具可以独立测试，提高代码质量
- ✅ **错误隔离**: 单个工具错误不影响其他工具运行

## 项目结构

```
NexusGUI/
├── src/                    # 源代码目录
│   ├── main/              # 主进程代码
│   │   ├── main.js        # Electron 主进程
│   │   └── preload.js     # 预加载脚本
│   ├── renderer/          # 渲染进程代码
│   │   ├── renderer.js    # 动态界面渲染器
│   │   ├── index.html     # 主界面 HTML
│   │   └── styles.css     # 样式文件
│   └── mcp/               # MCP 服务器代码
│       ├── sse/           # SSE 传输相关
│       │   ├── server.js  # 重构后的 SSE MCP 服务器
│       │   ├── wrapper.js # SSE 服务器包装器
│       │   ├── transport.js # SSE 传输层
│       │   ├── tools/     # 🆕 工具模块目录
│       │   │   ├── BaseToolHandler.js    # 基础工具处理器
│       │   │   ├── ToolRegistry.js       # 工具注册器
│       │   │   ├── RenderGUITool.js      # GUI渲染工具
│       │   │   ├── InjectJSTool.js       # JS注入工具
│       │   │   ├── NotificationTool.js   # 通知工具
│       │   │   ├── index.js             # 统一导出
│       │   │   ├── test.js              # 工具测试
│       │   │   └── README.md            # 架构说明
│       │   ├── schemas/   # 🆕 Schema定义目录
│       │   │   ├── renderGUISchema.js    # GUI工具Schema
│       │   │   ├── injectJSSchema.js     # JS注入工具Schema
│       │   │   └── notificationSchema.js # 通知工具Schema
│       │   ├── utils/     # 🆕 工具类目录
│       │   │   └── htmlUtils.js         # HTML处理工具类
│       │   ├── validators/ # 🆕 验证器目录
│       │   └── MIGRATION.md # 🆕 重构迁移指南
│       └── stdio/         # 标准传输相关（备用）
│           ├── server.mjs # 标准 MCP 服务器
│           └── wrapper.js # 标准服务器包装器
├── test/                  # 测试文件
│   ├── setup.js          # 测试环境设置
│   └── renderer.test.js  # 渲染器测试
├── tools/                 # 工具和调试
│   ├── diagnose.js       # 诊断工具
│   └── test-debug.js     # 测试调试脚本
├── package.json          # 项目配置
├── jest.config.js        # Jest 测试配置
└── README.md            # 项目说明
```

## 文件说明

### 核心文件
- **`src/main/main.js`**: Electron 主进程，负责窗口管理和 MCP 服务器集成
- **`src/main/preload.js`**: 预加载脚本，提供安全的 IPC 通信接口
- **`src/renderer/renderer.js`**: 动态界面渲染器，接收 GUI 定义并创建界面
- **`src/renderer/index.html`**: 主界面 HTML 模板
- **`src/renderer/styles.css`**: 界面样式文件

### MCP 服务器（重构后）
- **`src/mcp/sse/server.js`**: 重构后的 SSE MCP 服务器（采用模块化架构）
- **`src/mcp/sse/wrapper.js`**: SSE 服务器包装器
- **`src/mcp/sse/transport.js`**: SSE 传输层实现

### 🆕 工具系统架构
- **`src/mcp/sse/tools/BaseToolHandler.js`**: 基础工具处理器（抽象基类）
- **`src/mcp/sse/tools/ToolRegistry.js`**: 工具注册器（统一管理）
- **`src/mcp/sse/tools/RenderGUITool.js`**: GUI渲染工具实现
- **`src/mcp/sse/tools/InjectJSTool.js`**: JavaScript注入工具实现
- **`src/mcp/sse/tools/NotificationTool.js`**: 通知工具实现
- **`src/mcp/sse/tools/index.js`**: 工具模块统一导出
- **`src/mcp/sse/tools/test.js`**: 工具系统测试文件
- **`src/mcp/sse/tools/README.md`**: 详细架构说明文档

### 🆕 Schema定义
- **`src/mcp/sse/schemas/renderGUISchema.js`**: GUI渲染工具的Schema定义
- **`src/mcp/sse/schemas/injectJSSchema.js`**: JS注入工具的Schema定义
- **`src/mcp/sse/schemas/notificationSchema.js`**: 通知工具的Schema定义

### 🆕 工具类和验证器
- **`src/mcp/sse/utils/htmlUtils.js`**: HTML处理和窗口配置验证工具类
- **`src/mcp/sse/validators/`**: 验证器目录（预留扩展）
- **`src/mcp/sse/MIGRATION.md`**: 重构迁移指南和最佳实践

### 备用服务器
- **`src/mcp/stdio/server.mjs`**: 标准传输的 MCP 服务器（备用）
- **`src/mcp/stdio/wrapper.js`**: 标准服务器包装器

### 测试和工具
- **`test/`**: Jest 测试文件
- **`tools/diagnose.js`**: 系统诊断工具
- **`tools/test-debug.js`**: 服务器测试调试脚本

## 启动方式

### 系统托盘模式（推荐）
```bash
# 托盘模式启动（默认）
npm start

# 带主窗口启动
npm run start-with-window

# 开发模式
npm run dev
```

### 其他启动选项
```bash
# 运行测试
npm test

# 构建应用
npm run build
```

### MCP 服务器端点
启动后，MCP 服务器将在以下端点提供服务：
- **SSE 连接**: `http://localhost:3001/mcp`
- **消息处理**: `http://localhost:3001/messages`
- **健康检查**: `http://localhost:3001/health`
- **调试信息**: `http://localhost:3001/debug/sessions`

## 窗口复用功能

### 基本用法

```javascript
// 复用现有窗口
{
  "title": "复用的窗口",
  "width": 800,
  "height": 600,
  "reuseWindow": true,  // 关键参数：启用窗口复用
  "components": [
    { "type": "heading", "text": "复用的窗口", "level": 1 },
    { "type": "text", "text": "这个窗口复用了之前的窗口" },
    { "type": "button", "text": "点击我", "onClick": "handleClick" }
  ],
  "callbacks": {
    "handleClick": "alert('复用窗口的按钮被点击了！');"
  }
}
```

### 窗口复用 vs 新建窗口

```javascript
// 方式 1: 创建新窗口（默认行为）
{
  "title": "新窗口",
  "reuseWindow": false,  // 或不设置此参数
  "components": [...]
}

// 方式 2: 复用现有窗口
{
  "title": "复用窗口",
  "reuseWindow": true,   // 启用复用
  "components": [...]
}
```

### 复用窗口的优势

- **保持窗口位置**: 窗口不会重新定位到屏幕中央
- **保持窗口大小**: 如果新配置没有指定尺寸，保持原有尺寸
- **减少闪烁**: 避免窗口关闭和重新创建的过程
- **提升性能**: 减少资源消耗和初始化时间
- **更好的用户体验**: 窗口状态保持连续

## HTML 模式使用

### 基本用法

```javascript
// 通过 MCP 调用 render-gui 工具
{
  "title": "HTML 界面示例",
  "width": 800,
  "height": 600,
  "html": `
    <div style="padding: 20px;">
      <h1>Hello World</h1>
      <p>这是一个 HTML 界面</p>
      <button onclick="alert('点击了按钮')">点击我</button>
    </div>
  `
}
```

### 同步等待结果

```javascript
{
  "title": "用户确认对话框",
  "width": 400,
  "height": 300,
  "waitForResult": true,  // 同步等待结果
  "html": `
    <div style="padding: 20px; text-align: center;">
      <h2>确认操作</h2>
      <p>您确定要执行此操作吗？</p>
      <button onclick="electronAPI.sendResult({action: 'confirm', result: true})">
        确认
      </button>
      <button onclick="electronAPI.sendResult({action: 'cancel', result: false})">
        取消
      </button>
    </div>
  `
}
```

### 窗口复用功能

```javascript
{
  "title": "复用窗口示例",
  "reuseWindow": true,  // 复用现有窗口
  "html": `
    <div style="padding: 20px;">
      <h1>窗口已更新</h1>
      <p>这个内容替换了之前的窗口内容</p>
    </div>
  `
}
```

### 高级功能

```javascript
{
  "title": "复杂 HTML 界面",
  "width": 600,
  "height": 500,
  "data": {
    "userName": "张三",
    "userAge": 25
  },
  "html": `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333;">用户信息表单</h1>
      
      <form id="userForm">
        <div style="margin-bottom: 15px;">
          <label>姓名：</label>
          <input type="text" name="userName" value="{{userName}}" style="width: 200px; padding: 5px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label>年龄：</label>
          <input type="number" name="userAge" value="{{userAge}}" style="width: 200px; padding: 5px;">
        </div>
        <button type="button" onclick="handleSubmit()">提交</button>
      </form>
      
      <div id="result"></div>
    </div>
  `,
  "callbacks": {
    "handleSubmit": `
      const formData = getFormData('#userForm');
      electronAPI.sendResult({ action: 'submit', data: formData });
    `
  }
}
```

### 功能特点

- **完整 HTML 支持**: 支持所有 HTML 标签和属性
- **CSS 样式**: 支持内联样式和外部 CSS
- **JavaScript 交互**: 支持事件处理和动态交互
- **同步等待**: 通过 `waitForResult` 参数同步等待用户操作结果
- **窗口复用**: 通过 `reuseWindow` 参数复用现有窗口
- **数据绑定**: 支持初始数据注入和模板变量替换
- **回调函数**: 支持自定义回调函数注入
- **内置API**: 提供 `electronAPI.sendResult()` 和 `getFormData()` 函数

## 技术栈

- **Electron**: 桌面应用框架 (v27.0.0)
- **Model Context Protocol (MCP)**: AI 通信协议 (@modelcontextprotocol/sdk v0.4.0)
- **Express**: Web 服务器框架 (v4.18.2)
- **Server-Sent Events (SSE)**: 实时通信传输层
- **CORS**: 跨域资源共享支持
- **Zod**: 数据验证和类型安全
- **Jest**: 测试框架 (v29.7.0)

## 核心特性

- 🎨 **动态界面渲染**: 支持 HTML 字符串和文件路径两种渲染模式
- 🔄 **窗口复用**: 智能窗口管理，减少资源消耗
- ⏱️ **同步等待**: 支持同步等待用户操作结果
- 🎛️ **丰富窗口属性**: 支持透明度、置顶、全屏等多种窗口设置
- 🌐 **跨域支持**: 内置 CORS 支持，方便集成
- 🔍 **实时调试**: 提供健康检查和会话调试端点
- 📱 **系统托盘**: 支持后台运行和托盘管理
