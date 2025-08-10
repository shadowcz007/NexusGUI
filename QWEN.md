# NexusGUI 技术设计文档

## 1. 项目概述

NexusGUI 是一个基于 Electron 和 Model Context Protocol (MCP) 的桌面应用框架，旨在通过 AI 生成界面定义并动态渲染到桌面端。它允许开发者通过 MCP 协议与应用交互，动态创建和管理桌面窗口界面。

## 2. 核心架构

NexusGUI 采用模块化、分层的架构设计，主要分为以下几个核心部分：

### 2.1 Electron 主进程

- **入口文件**: `src/main/main.js`
- **职责**:
  - 应用生命周期管理（启动、退出）
  - 窗口创建和管理
  - 服务管理（通过 `ServiceManager`）
  - 与 MCP 服务器集成，提供 `createWindow` 全局函数供 MCP 工具调用
  - 系统托盘集成

### 2.2 服务管理器 (ServiceManager)

- **文件**: `src/main/managers/ServiceManager.js`
- **职责**:
  - 统一管理应用的核心服务，包括日志、错误处理、应用状态、服务器、窗口和托盘服务
  - 负责服务的初始化、启动、停止和生命周期管理
  - 确保服务间的依赖关系正确处理

### 2.3 核心服务

1.  **应用状态服务 (AppStateService)**: 管理全局应用状态，如服务器信息、窗口列表、会话信息等
2.  **服务器服务 (ServerService)**: 管理 MCP 服务器的启动和停止
3.  **窗口服务 (WindowService)**: 负责 Electron 窗口的创建、复用、关闭等操作
4.  **托盘服务 (TrayService)**: 管理系统托盘图标和菜单
5.  **日志服务 (LoggerService)**: 提供统一的日志记录功能
6.  **错误处理服务 (ErrorHandlerService)**: 统一处理应用中的错误

### 2.4 MCP 服务器 (SSE)

- **入口文件**: `src/mcp/sse/server.js`
- **传输协议**: Server-Sent Events (SSE)
- **职责**:
  - 实现 MCP 协议，与 AI 工具进行通信
  - 管理工具注册和执行
  - 提供 HTTP 端点（/mcp, /messages, /health, /debug/sessions）

### 2.5 工具系统 (重构后)

NexusGUI 采用了模块化的工具系统架构，所有 MCP 工具都遵循统一的接口和管理模式。

#### 2.5.1 核心组件

- **BaseToolHandler (`src/mcp/sse/tools/BaseToolHandler.js`)**:
  - 所有工具的基类，定义了工具的基本接口（`getSchema`, `execute`）和通用功能（验证、日志、错误处理）
- **ToolRegistry (`src/mcp/sse/tools/ToolRegistry.js`)**:
  - 工具注册器，负责工具的注册、查找、执行和生命周期管理
  - 提供统一的工具调用入口，隔离工具实现细节
- **Schema 定义 (`src/mcp/sse/schemas/`)**:
  - 每个工具的输入参数都通过 JSON Schema 进行严格定义，确保类型安全和参数验证

#### 2.5.2 核心工具

1.  **RenderGUITool (`src/mcp/sse/tools/RenderGUITool.js`)**:
    - 核心功能工具，用于渲染 HTML 界面到桌面窗口
    - 支持丰富的窗口属性配置（大小、位置、样式、行为等）
    - 支持窗口复用和同步等待结果功能
    - 集成 HTML 到 Markdown 的自动转换和缓存功能
2.  **GetGUITool (`src/mcp/sse/tools/GetGUITool.js`)**:
    - 用于获取由 RenderGUITool 缓存的 HTML 内容和 Markdown 文档
    - 支持多种获取方式（仅路径、仅内容、两者兼有）
3.  **InjectJSTool (`src/mcp/sse/tools/InjectJSTool.js`)**:
    - 用于向当前活动窗口注入并执行 JavaScript 代码
4.  **NotificationTool (`src/mcp/sse/tools/NotificationTool.js`)**:
    - 用于发送桌面通知

### 2.6 工具类和实用程序

- **HtmlUtils (`src/mcp/sse/utils/htmlUtils.js`)**:
  - 提供 HTML 输入处理、验证和窗口配置验证功能
- **MarkdownUtils (`src/mcp/sse/utils/markdownUtils.js`)**:
  - 提供 HTML 到 Markdown 的转换、文件保存、读取和管理功能
  - 使用 `turndown` 库实现高质量转换
  - 自动管理缓存文件，包括时间戳命名和最新文件链接

## 3. 关键特性实现

### 3.1 动态界面渲染

- 通过 `render-gui` 工具接收 HTML 内容（字符串或文件路径）
- 调用全局 `createWindow` 函数（由主进程提供）创建或复用 Electron 窗口
- 支持完整的 HTML、CSS 和 JavaScript，可创建任意复杂的用户界面

### 3.2 窗口复用

- 通过 `reuseWindow` 参数控制
- `WindowService` 在创建窗口前检查现有窗口，若启用复用则更新现有窗口内容而非创建新窗口

### 3.3 同步等待结果

- 通过 `waitForResult` 参数控制
- `WindowService` 在创建窗口时创建 Promise，并在窗口关闭或调用 `electronAPI.sendResult()` 时解析 Promise，返回结果给 MCP 客户端

### 3.4 HTML 到 Markdown 转换与缓存

- `RenderGUITool` 在渲染界面时自动调用 `MarkdownUtils` 进行转换
- 转换后的 Markdown 文件保存到系统临时目录 (`/tmp/nexusgui-cache/`)
- 自动生成带时间戳的文件名和指向最新文件的链接 (`latest.md`)
- `GetGUITool` 可用于获取缓存的 HTML 和 Markdown 内容

### 3.5 系统托盘集成

- `TrayService` 负责创建和管理托盘图标
- 托盘菜单提供对 MCP 服务器的控制（启动、停止、重启）、调试信息查看等功能
- 双击托盘图标可显示缓存的 GUI 界面

## 4. 技术栈

- **Electron**: v27.0.0 (桌面应用框架)
- **Model Context Protocol SDK**: v0.4.0 (MCP 通信协议)
- **Express**: v4.18.2 (Web 服务器框架)
- **Server-Sent Events (SSE)**: 实时通信传输层
- **Zod**: v3.22.4 (数据验证)
- **Turndown**: v7.2.0 (HTML 到 Markdown 转换)
- **Jest**: v29.7.0 (测试框架)

## 5. 项目结构

```
NexusGUI/
├── src/
│   ├── main/              # Electron 主进程代码
│   │   ├── main.js        # 主进程入口
│   │   ├── preload.js     # 预加载脚本
│   │   ├── managers/      # 服务管理器
│   │   ├── services/      # 核心服务实现
│   │   └── html/          # 内置界面HTML模板
│   ├── renderer/          # 渲染进程代码
│   │   ├── renderer.js    # 动态界面渲染器
│   │   ├── index.html     # 主界面 HTML 模板
│   │   └── styles.css     # 样式文件
│   └── mcp/               # MCP 服务器代码
│       ├── sse/           # SSE 传输相关
│       │   ├── server.js  # MCP 服务器实现
│       │   ├── wrapper.js # ES Module 包装器
│       │   ├── transport.js # SSE 传输层
│       │   ├── tools/     # 工具模块
│       │   ├── schemas/   # 工具 Schema 定义
│       │   ├── utils/     # 工具类
│       │   └── validators/ # 验证器
│       └── stdio/         # 标准传输相关（备用）
├── test/                  # 测试文件
├── tools/                 # 工具和调试脚本
├── assets/                # 静态资源（图标等）
└── package.json          # 项目配置
```

## 6. 待办事项 (Todo List)

### 6.1 启动模式优化
- [ ] 提供首次启动向导，让用户选择默认启动模式
- [ ] 在系统托盘菜单中增加"切换到主窗口模式"选项
- [ ] 默认以系统托盘模式启动，减少资源占用

### 6.2 窗口管理简化
- [ ] 提供自动窗口管理选项，根据应用使用场景智能决定是否复用窗口
- [ ] 增加"一键关闭所有动态窗口"功能到托盘菜单
- [ ] 在窗口标题栏增加"固定窗口"选项，防止被自动关闭

### 6.3 HTML 到 Markdown 转换优化
- [ ] 在 render-gui 工具执行后，自动显示 Markdown 文件路径
- [ ] 提供"在文件管理器中显示"选项，方便用户访问生成的文件
- [ ] 增加转换结果预览功能，用户可以直接查看转换后的 Markdown

### 6.4 系统托盘增强
- [ ] 增加最近渲染的界面历史记录，支持快速重新渲染
- [ ] 提供"快速测试"功能，渲染预定义的测试界面
- [ ] 增加网络状态指示，显示与 AI 工具的连接状态

### 6.5 调试功能增强
- [ ] 提供统一的调试控制台，集中显示所有日志和调试信息
- [ ] 增加实时监控面板，显示服务器状态、会话数量、资源使用等
- [ ] 提供 API 测试工具，方便开发者测试 MCP 工具调用

---