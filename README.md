# NexusGUI

通过 MCP 传递 GUI 定义，实现 AI 生成界面，桌面端渲染

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

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 运行测试
npm test

# 启动诊断工具
node tools/diagnose.js

# 启动 SSE 服务器测试
node tools/test-debug.js
```

## 技术栈

- **Electron**: 桌面应用框架
- **Model Context Protocol (MCP)**: AI 通信协议
- **Server-Sent Events (SSE)**: 实时通信
- **Jest**: 测试框架
