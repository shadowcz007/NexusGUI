# NexusGUI

通过 MCP 传递 GUI 定义，实现 AI 生成界面，桌面端渲染

## 🆕 最新功能

### 系统托盘集成 🆕
- ✅ 支持系统托盘模式运行，无需保持主窗口
- ✅ 右击托盘图标访问MCP服务器控制台和调试功能
- ✅ 实时显示服务器状态、端口和活动会话信息
- ✅ 集成健康检查、调试信息、会话管理等工具
- ✅ 支持服务器设置和配置管理
- ✅ 跨平台支持（macOS、Windows、Linux）

详细使用指南请查看：[TRAY_USAGE.md](./TRAY_USAGE.md)

### HTML 直接渲染模式 🆕
- ✅ 支持直接传入 HTML 字符串进行界面渲染
- ✅ 完全自定义的界面布局和样式
- ✅ 支持 JavaScript 事件处理和交互
- ✅ 与组件模式并存，提供最大灵活性

### 窗口复用功能 🆕
- ✅ 支持复用现有窗口而不是销毁重建
- ✅ 通过 `reuseWindow` 参数控制窗口复用行为
- ✅ 保持窗口状态和位置，提升用户体验
- ✅ 减少资源消耗，提高性能

### 窗口属性设置
- ✅ 支持丰富的窗口属性配置（菜单栏、边框、透明度、全屏等）
- ✅ 详细的系统状态显示（MCP服务器地址、端点信息等）
- ✅ 向后兼容，所有现有功能保持不变

详细文档请查看：[WINDOW_PROPERTIES.md](./WINDOW_PROPERTIES.md) 和 [WINDOW_REUSE.md](./WINDOW_REUSE.md)

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
│       │   ├── server.js  # SSE MCP 服务器
│       │   ├── wrapper.js # SSE 服务器包装器
│       │   └── transport.js # SSE 传输层
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

### MCP 服务器
- **`src/mcp/sse/server.js`**: SSE 传输的 MCP 服务器（主要使用）
- **`src/mcp/sse/wrapper.js`**: SSE 服务器包装器
- **`src/mcp/sse/transport.js`**: SSE 传输层实现
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

# 启动诊断工具
node tools/diagnose.js

# 启动 SSE 服务器测试
node tools/test-debug.js

# 启动 HTML GUI 演示
node demo-html-gui.js

# 启动窗口复用功能测试
node test-window-reuse.js

# 启动窗口复用功能演示
node demo-window-reuse.js

# 验证窗口复用功能实现
node verify-window-reuse.js
```

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

### 高级功能

```javascript
{
  "title": "复杂 HTML 界面",
  "html": `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333;">复杂界面示例</h1>
      
      <form id="myForm">
        <input type="text" name="username" placeholder="用户名">
        <button type="submit">提交</button>
      </form>
      
      <div id="result"></div>
    </div>
  `,
  "callbacks": {
    "handleSubmit": `
      const formData = getFormData('#myForm');
      sendResult({ action: 'submit', data: formData });
    `
  }
}
```

### 功能特点

- **完整 HTML 支持**: 支持所有 HTML 标签和属性
- **CSS 样式**: 支持内联样式和外部 CSS
- **JavaScript 交互**: 支持事件处理和动态交互
- **表单处理**: 自动提供 `getFormData()` 函数
- **回调函数**: 支持自定义回调函数注入
- **数据绑定**: 支持初始数据注入

## 技术栈

- **Electron**: 桌面应用框架
- **Model Context Protocol (MCP)**: AI 通信协议
- **Server-Sent Events (SSE)**: 实时通信
- **Jest**: 测试框架
