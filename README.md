# 🚀 NexusGUI 技术实现方案 
## **通过 MCP 传递 GUI 定义，实现“AI 生成界面，桌面端渲染”**

> **核心理念**：  
> - 桌面应用内置一个通用 MCP Tool：`render-dynamic-gui`  
> - AI 调用该 Tool 时，**直接传入 GUI 的结构定义**（如 JSX 字符串、JSON 描述）  
> - 桌面端接收后，**无需预定义**，立即动态创建窗口并渲染  
> - 实现 **“AI 生成界面，桌面端展示”** 的终极动态能力

---

## ✅ 一、目标

| 目标 | 说明 |
|------|------|
| ✅ **GUI 定义由 AI 动态生成并传入** | 不再依赖本地 `.jsx` 文件 |
| ✅ **桌面端无需预知 GUI 结构** | 接收到什么就渲染什么 |
| ✅ **统一渲染入口** | 所有 GUI（命令行或 MCP）都走 `createWindow(config)` |
| ✅ **支持参数化渲染** | AI 可传入数据、回调逻辑 |
| ✅ **低延迟、热加载** | 即时弹窗，无需重启 |

---

## ✅ 二、架构图

```
                    +------------------+
                    |   AI Agent       |
                    | (MCP Client)     |
                    +--------+---------+
                             | 调用
                             v
           { method: "render-dynamic-gui", 
             params: { title: "登录", 
                       components: [ ... ] } }
                             |
                             v
+----------------------------------------------------------------------------+
|                   NexusGUI (Electron)                                      |
|                                                                            |
|   +---------------------+                                                  |
|   |   MCP Server        |←─────────────────────────────────────────────────+
|   | - 提供通用 Tool     |     接收 GUI 定义
|   | - 动态创建窗口      |
|   +----------+----------+
|              |
|   +----------v----------+     
|   | 主进程 (Main)       |
|   | - createWindow(config) → 渲染进程
|   +---------------------+
```

---

## ✅ 三、核心 MCP Tool：`render-dynamic-gui`

```js
// 在 MCP Server 中注册一个通用 Tool
mcpServer.tool(
  'render-dynamic-gui',
  'Render a dynamic GUI from a JSON-like structure (AI-generated)',
  {
    title: z.string().describe('Window title'),
    width: z.number().optional().default(800),
    height: z.number().optional().default(600),
    components: z.array(z.any()).describe('GUI components in NexusGUI format'),
    data: z.record(z.any()).optional().describe('Initial data for the GUI'),
    callbacks: z.record(z.string()).optional().describe('Function strings for events')
  },
  async ({ title, width, height, components, data, callbacks }, { sendNotification }) => {
    sendNotification({
      method: 'notifications/message',
      params: { level: 'info',  `Rendering dynamic GUI: ${title}` }
    });

    // 在主进程中创建动态 GUI 窗口
    await global.createWindow({
      type: 'dynamic',
      title,
      width,
      height,
      components,
      data,
      callbacks
    });

    return {
      content: [
        { type: 'text', text: `✅ GUI "${title}" 已展示，请用户交互` }
      ]
    };
  }
);
```

---

## ✅ 四、主进程：统一 GUI 创建函数（`createWindow`）

```js
// main.js
async function createWindow(config) {
  const win = new BrowserWindow({
    width: config.width || 800,
    height: config.height || 600,
    title: config.title || 'Dynamic GUI',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('render-dynamic-gui', config);
  });

  return win;
}
```

---

## ✅ 五、渲染进程：动态渲染传入的 GUI（`renderer.js`）

```js
// renderer.js
window.addEventListener('DOMContentLoaded', () => {
  window.electronAPI.on('render-dynamic-gui', (config) => {
    document.title = config.title;
    const app = document.getElementById('app');
    app.innerHTML = '';

    // 注入初始数据到全局
    globalThis.__gui_data__ = config.data || {};

    // 渲染组件
    config.components.forEach(comp => {
      const el = createComponent(comp, config.callbacks);
      app.appendChild(el);
    });
  });
});

function createComponent(comp, callbacks) {
  let el;

  switch (comp.type) {
    case 'heading':
      el = document.createElement(`h${comp.level || 2}`);
      el.textContent = comp.text;
      el.className = comp.className || '';
      break;

    case 'input':
      const label = document.createElement('label');
      label.textContent = comp.label;
      label.className = 'block text-sm font-medium mb-1';

      const input = document.createElement('input');
      input.name = comp.name;
      input.type = comp.inputType || 'text';
      input.value = globalThis.__gui_data__[comp.name] || '';
      input.placeholder = comp.placeholder;
      input.className = 'w-full px-3 py-2 border rounded-md';

      el = document.createElement('div');
      el.className = 'mb-4';
      el.appendChild(label);
      el.appendChild(input);
      break;

    case 'button':
      el = document.createElement('button');
      el.textContent = comp.text;
      el.className = `px-4 py-2 rounded ${comp.className || 'bg-blue-600 text-white'}`;

      const handlerCode = callbacks?.[comp.onClick];
      if (handlerCode) {
        el.onclick = () => {
          try {
            // 安全执行：传入上下文
            const fn = new Function('data', 'sendResult', handlerCode);
            fn(globalThis.__gui_data__, (result) => {
              // 可通过 IPC 返回结果给 MCP
              window.electronAPI.send('mcp-result', result);
            });
          } catch (err) {
            alert('执行失败: ' + err.message);
          }
        };
      }
      break;

    default:
      el = document.createElement('div');
      el.textContent = `未知组件: ${comp.type}`;
  }

  return el;
}
```

---

## ✅ 六、AI 调用示例（MCP JSON-RPC）

```json
{
  "jsonrpc": "2.0",
  "method": "render-dynamic-gui",
  "params": {
    "title": "用户反馈",
    "width": 500,
    "height": 400,
    "data": {
      "issue": "性能问题"
    },
    "components": [
      {
        "type": "heading",
        "text": "请描述问题",
        "level": 2
      },
      {
        "type": "input",
        "label": "问题类型",
        "name": "issue",
        "placeholder": "如：卡顿、崩溃"
      },
      {
        "type": "textarea",
        "label": "详细描述",
        "name": "details",
        "rows": 4,
        "placeholder": "请详细描述..."
      },
      {
        "type": "button",
        "text": "提交反馈",
        "onClick": "submitFeedback",
        "className": "w-full bg-green-600 text-white"
      }
    ],
    "callbacks": {
      "submitFeedback": "const data = { issue: document.querySelector('[name=issue]').value, details: document.querySelector('[name=details]').value }; sendResult({ type: 'feedback', data }); window.close();"
    }
  },
  "id": "1"
}
```

> ✅ 效果：AI 调用后，桌面端立即弹出“用户反馈”表单。

---

## ✅ 七、与命令行 `-gui` 的统一

| 方式 | 输入 | 处理 |
|------|------|------|
| `nexusgui -gui login` | 本地 `login.jsx` → 解析为 config | `createWindow(config)` |
| MCP `render-dynamic-gui` | AI 传入 JSON config | `createWindow(config)` |

> ✅ **完全统一渲染路径**，只是 GUI 定义来源不同。

---

## ✅ 八、优势总结

| 特性 | 说明 |
|------|------|
| 🚀 **极致动态** | GUI 由 AI 实时生成，桌面端只负责渲染 |
| 🤖 **AI 主导** | 界面不再是预定义的，而是 AI 根据上下文生成 |
| 🔌 **解耦清晰** | 逻辑在 AI，展示在桌面，职责分离 |
| 📦 **零部署** | 新界面无需发版，AI 直接传入 |
| 🔄 **双向通信** | 用户操作可回调给 AI |

---

## ✅ 九、典型场景

1. **AI 生成调查问卷**
   - AI 根据上下文生成问题 → 调用 `render-dynamic-gui` 展示
   - 用户填写 → 结果返回给 AI 分析

2. **AI 请求权限确认**
   - AI 生成“是否允许访问文件？”弹窗
   - 用户点击“同意” → 返回结果

3. **动态调试面板**
   - AI 检测到异常 → 生成调试 GUI → 弹出供用户操作

4. **个性化表单**
   - AI 根据用户画像生成定制表单

---
 

## ✅ 十一、总结

> **NexusGUI v5.0 实现了“AI 生成界面，桌面端渲染”的终极动态架构**：

- ✅ 不再需要预定义 `.jsx` 文件
- ✅ GUI 完全由 AI 在运行时生成并传递
- ✅ 桌面端成为“智能 GUI 渲染器”
- ✅ 真正的 **AI 与桌面深度融合**
 
