# 🚀 NexusGUI 技术实现方案 
## **通过 MCP 传递 GUI 定义，实现"AI 生成界面，桌面端渲染"**

> **核心理念**：  
> - 桌面应用内置一个通用 MCP Tool：`render-dynamic-gui`  
> - AI 调用该 Tool 时，**直接传入 GUI 的结构定义**（如 JSX 字符串、JSON 描述）  
> - 桌面端接收后，**无需预定义**，立即动态创建窗口并渲染  
> - 实现 **"AI 生成界面，桌面端展示"** 的终极动态能力

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
      try {
        const el = createComponent(comp, config.callbacks);
        if (el) app.appendChild(el);
      } catch (error) {
        console.error(`组件渲染失败: ${comp.type}`, error);
        // 添加错误提示组件替代失败的组件
        const errorEl = createErrorComponent(comp, error);
        app.appendChild(errorEl);
      }
    });
  });
});

// 创建错误提示组件
function createErrorComponent(failedComp, error) {
  const el = document.createElement('div');
  el.className = 'error-component p-3 mb-3 border border-red-300 bg-red-50 rounded';
  
  const title = document.createElement('div');
  title.className = 'font-medium text-red-600';
  title.textContent = `组件渲染失败: ${failedComp.type || '未知类型'}`;
  
  const message = document.createElement('div');
  message.className = 'text-sm text-red-500';
  message.textContent = error.message;
  
  el.appendChild(title);
  el.appendChild(message);
  return el;
}

function createComponent(comp, callbacks) {
  if (!comp || typeof comp !== 'object') {
    throw new Error('无效的组件定义');
  }

  let el;

  try {
    switch (comp.type) {
      case 'heading':
        el = document.createElement(`h${comp.level || 2}`);
        el.textContent = comp.text || '标题';
        el.className = comp.className || '';
        break;

      case 'text':
        el = document.createElement('p');
        el.textContent = comp.text || '';
        el.className = comp.className || '';
        break;

      case 'input':
        const label = document.createElement('label');
        label.textContent = comp.label || '输入项';
        label.className = 'block text-sm font-medium mb-1';

        const input = document.createElement('input');
        input.name = comp.name || `input_${Date.now()}`;
        input.type = comp.inputType || 'text';
        input.value = comp.name ? (globalThis.__gui_data__[comp.name] || '') : '';
        input.placeholder = comp.placeholder || '';
        input.className = 'w-full px-3 py-2 border rounded-md';
        
        if (comp.required) input.required = true;
        if (comp.disabled) input.disabled = true;
        if (comp.maxLength) input.maxLength = comp.maxLength;

        el = document.createElement('div');
        el.className = 'mb-4';
        el.appendChild(label);
        el.appendChild(input);
        break;

      case 'textarea':
        const textareaLabel = document.createElement('label');
        textareaLabel.textContent = comp.label || '文本区域';
        textareaLabel.className = 'block text-sm font-medium mb-1';

        const textarea = document.createElement('textarea');
        textarea.name = comp.name || `textarea_${Date.now()}`;
        textarea.rows = comp.rows || 3;
        textarea.value = comp.name ? (globalThis.__gui_data__[comp.name] || '') : '';
        textarea.placeholder = comp.placeholder || '';
        textarea.className = 'w-full px-3 py-2 border rounded-md';
        
        if (comp.required) textarea.required = true;
        if (comp.disabled) textarea.disabled = true;

        el = document.createElement('div');
        el.className = 'mb-4';
        el.appendChild(textareaLabel);
        el.appendChild(textarea);
        break;

      case 'select':
        const selectLabel = document.createElement('label');
        selectLabel.textContent = comp.label || '选择项';
        selectLabel.className = 'block text-sm font-medium mb-1';

        const select = document.createElement('select');
        select.name = comp.name || `select_${Date.now()}`;
        select.className = 'w-full px-3 py-2 border rounded-md';
        
        if (comp.required) select.required = true;
        if (comp.disabled) select.disabled = true;
        
        // 添加选项
        if (Array.isArray(comp.options)) {
          comp.options.forEach(option => {
            const optEl = document.createElement('option');
            optEl.value = option.value || option;
            optEl.textContent = option.label || option;
            if (option.selected) optEl.selected = true;
            select.appendChild(optEl);
          });
        }

        el = document.createElement('div');
        el.className = 'mb-4';
        el.appendChild(selectLabel);
        el.appendChild(select);
        break;

      case 'checkbox':
        el = document.createElement('div');
        el.className = 'flex items-center mb-4';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = comp.name || `checkbox_${Date.now()}`;
        checkbox.id = checkbox.name;
        checkbox.className = 'mr-2';
        if (comp.checked) checkbox.checked = true;
        if (comp.disabled) checkbox.disabled = true;
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = checkbox.id;
        checkboxLabel.textContent = comp.label || '选项';
        
        el.appendChild(checkbox);
        el.appendChild(checkboxLabel);
        break;

      case 'radio-group':
        el = document.createElement('fieldset');
        el.className = 'mb-4';
        
        const legend = document.createElement('legend');
        legend.textContent = comp.label || '选项组';
        legend.className = 'text-sm font-medium mb-2';
        el.appendChild(legend);
        
        if (Array.isArray(comp.options)) {
          const groupName = comp.name || `radio_group_${Date.now()}`;
          comp.options.forEach((option, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center mb-1';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = groupName;
            radio.id = `${groupName}_${idx}`;
            radio.value = option.value || option;
            radio.className = 'mr-2';
            if (option.checked) radio.checked = true;
            
            const radioLabel = document.createElement('label');
            radioLabel.htmlFor = radio.id;
            radioLabel.textContent = option.label || option;
            
            wrapper.appendChild(radio);
            wrapper.appendChild(radioLabel);
            el.appendChild(wrapper);
          });
        }
        break;

      case 'button':
        el = document.createElement('button');
        el.textContent = comp.text || '按钮';
        el.className = `px-4 py-2 rounded ${comp.className || 'bg-blue-600 text-white'}`;
        if (comp.disabled) el.disabled = true;

        const handlerCode = comp.onClick && callbacks?.[comp.onClick];
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
              console.error('回调执行失败:', err);
              alert('执行失败: ' + err.message);
            }
          };
        }
        break;

      case 'image':
        el = document.createElement('img');
        el.src = comp.src || '';
        el.alt = comp.alt || '';
        el.className = comp.className || 'max-w-full h-auto';
        if (comp.width) el.width = comp.width;
        if (comp.height) el.height = comp.height;
        break;

      case 'divider':
        el = document.createElement('hr');
        el.className = comp.className || 'my-4 border-t';
        break;

      case 'container':
        el = document.createElement('div');
        el.className = comp.className || '';
        
        // 递归渲染子组件
        if (Array.isArray(comp.children)) {
          comp.children.forEach(childComp => {
            try {
              const childEl = createComponent(childComp, callbacks);
              if (childEl) el.appendChild(childEl);
            } catch (error) {
              console.error(`子组件渲染失败: ${childComp.type}`, error);
              const errorEl = createErrorComponent(childComp, error);
              el.appendChild(errorEl);
            }
          });
        }
        break;

      case 'link':
        el = document.createElement('a');
        el.href = comp.href || '#';
        el.textContent = comp.text || '链接';
        el.className = comp.className || 'text-blue-600 hover:underline';
        if (comp.target) el.target = comp.target;
        break;

      // 扩展组件：进度条
      case 'progress':
        el = document.createElement('div');
        el.className = 'mb-4';
        
        if (comp.label) {
          const progressLabel = document.createElement('label');
          progressLabel.textContent = comp.label;
          progressLabel.className = 'block text-sm font-medium mb-1';
          el.appendChild(progressLabel);
        }
        
        const progressBar = document.createElement('div');
        progressBar.className = 'w-full bg-gray-200 rounded-full h-2.5';
        
        const progressFill = document.createElement('div');
        progressFill.className = comp.fillClassName || 'bg-blue-600 h-2.5 rounded-full';
        progressFill.style.width = `${comp.value || 0}%`;
        
        progressBar.appendChild(progressFill);
        el.appendChild(progressBar);
        
        if (comp.showValue) {
          const valueText = document.createElement('div');
          valueText.className = 'text-xs text-right mt-1';
          valueText.textContent = `${comp.value || 0}%`;
          el.appendChild(valueText);
        }
        break;
        
      // 扩展组件：标签
      case 'tag':
        el = document.createElement('span');
        el.textContent = comp.text || '';
        el.className = comp.className || 'inline-block px-2 py-1 text-xs rounded bg-gray-200 text-gray-800 mr-2 mb-2';
        break;
        
      // 扩展组件：卡片
      case 'card':
        el = document.createElement('div');
        el.className = comp.className || 'border rounded-lg p-4 shadow-sm mb-4';
        
        if (comp.title) {
          const cardTitle = document.createElement('h3');
          cardTitle.className = 'font-medium mb-2';
          cardTitle.textContent = comp.title;
          el.appendChild(cardTitle);
        }
        
        if (comp.content) {
          const cardContent = document.createElement('p');
          cardContent.textContent = comp.content;
          cardContent.className = 'text-gray-600';
          el.appendChild(cardContent);
        }
        
        // 递归渲染子组件
        if (Array.isArray(comp.children)) {
          comp.children.forEach(childComp => {
            try {
              const childEl = createComponent(childComp, callbacks);
              if (childEl) el.appendChild(childEl);
            } catch (error) {
              console.error(`子组件渲染失败: ${childComp.type}`, error);
              const errorEl = createErrorComponent(childComp, error);
              el.appendChild(errorEl);
            }
          });
        }
        break;

      default:
        // 未知组件类型时，创建一个提示元素而不是抛出错误
        el = document.createElement('div');
        el.className = 'unknown-component p-2 border border-yellow-300 bg-yellow-50 rounded';
        el.textContent = `未知组件类型: ${comp.type || '未指定'}`;
    }

    // 通用属性处理
    if (comp.id && el) el.id = comp.id;
    if (comp.style && el && typeof comp.style === 'object') {
      Object.assign(el.style, comp.style);
    }
    if (comp.attributes && el && typeof comp.attributes === 'object') {
      Object.entries(comp.attributes).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    if (comp.dataset && el && typeof comp.dataset === 'object') {
      Object.entries(comp.dataset).forEach(([key, value]) => {
        el.dataset[key] = value;
      });
    }

    return el;
  } catch (error) {
    console.error(`组件 ${comp.type} 创建失败:`, error);
    throw error; // 向上传递错误，由调用者处理
  }
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

> ✅ 效果：AI 调用后，桌面端立即弹出"用户反馈"表单。

---

## ✅ 七、与命令行 `-gui` 的统一

| 方式 | 输入 | 处理 |
|------|------|------|
| `nexusgui -gui login` | 本地 `login.jsx` → 解析为 config | `createWindow(config)` |
| MCP `render-dynamic-gui` | AI 传入 JSON config | `createWindow(config)` |

> ✅ **完全统一渲染路径**，只是 GUI 定义来源不同。

---

## ✅ 八、支持的组件类型

NexusGUI 支持多种组件类型，满足各种界面需求。每种组件都有其特定属性和用途。

### 基础组件

| 组件类型 | 描述 | 关键属性 |
|---------|------|---------|
| `heading` | 标题文本 | `text`, `level`(1-6), `className` |
| `text` | 普通文本段落 | `text`, `className` |
| `button` | 可点击按钮 | `text`, `onClick`, `className`, `disabled` |
| `link` | 超链接 | `text`, `href`, `target`, `className` |
| `image` | 图片 | `src`, `alt`, `width`, `height`, `className` |
| `divider` | 分隔线 | `className` |

### 表单组件

| 组件类型 | 描述 | 关键属性 |
|---------|------|---------|
| `input` | 单行输入框 | `label`, `name`, `inputType`, `placeholder`, `required`, `disabled`, `maxLength` |
| `textarea` | 多行文本框 | `label`, `name`, `rows`, `placeholder`, `required`, `disabled` |
| `select` | 下拉选择框 | `label`, `name`, `options`(数组), `required`, `disabled` |
| `checkbox` | 复选框 | `label`, `name`, `checked`, `disabled` |
| `radio-group` | 单选按钮组 | `label`, `name`, `options`(数组) |

### 扩展组件

| 组件类型 | 描述 | 关键属性 |
|---------|------|---------|
| `progress` | 进度条 | `value`, `label`, `showValue`, `fillClassName` |
| `tag` | 标签 | `text`, `className` |
| `card` | 卡片容器 | `title`, `content`, `className`, `children` |

### 容器组件

| 组件类型 | 描述 | 关键属性 |
|---------|------|---------|
| `container` | 容器元素，可包含子组件 | `className`, `children`(组件数组) |

### 通用属性

所有组件都支持以下通用属性：

- `id`: 元素ID
- `className`: CSS类名
- `style`: 内联样式对象
- `attributes`: 自定义HTML属性
- `dataset`: 数据属性(data-*)

### 示例：复杂表单

```json
{
  "components": [
    {
      "type": "container",
      "className": "form-container p-4",
      "children": [
        {
          "type": "heading",
          "text": "用户注册",
          "level": 2,
          "className": "mb-4 text-xl font-bold"
        },
        {
          "type": "input",
          "label": "用户名",
          "name": "username",
          "required": true,
          "placeholder": "请输入用户名"
        },
        {
          "type": "input",
          "label": "密码",
          "name": "password",
          "inputType": "password",
          "required": true,
          "placeholder": "请输入密码"
        },
        {
          "type": "select",
          "label": "用户角色",
          "name": "role",
          "options": [
            { "value": "user", "label": "普通用户", "selected": true },
            { "value": "admin", "label": "管理员" }
          ]
        },
        {
          "type": "checkbox",
          "label": "我已阅读并同意服务条款",
          "name": "agreement",
          "required": true
        },
        {
          "type": "container",
          "className": "flex justify-between mt-4",
          "children": [
            {
              "type": "button",
              "text": "取消",
              "className": "bg-gray-500 text-white"
            },
            {
              "type": "button",
              "text": "注册",
              "onClick": "submitRegistration",
              "className": "bg-green-600 text-white"
            }
          ]
        }
      ]
    }
  ]
}
```

## ✅ 九、优势总结

| 特性 | 说明 |
|------|------|
| 🚀 **极致动态** | GUI 由 AI 实时生成，桌面端只负责渲染 |
| 🤖 **AI 主导** | 界面不再是预定义的，而是 AI 根据上下文生成 |
| 🔌 **解耦清晰** | 逻辑在 AI，展示在桌面，职责分离 |
| 📦 **零部署** | 新界面无需发版，AI 直接传入 |
| 🔄 **双向通信** | 用户操作可回调给 AI |
| 🧩 **组件丰富** | 支持多种UI组件，满足各类界面需求 |
| 🛡️ **容错机制** | 组件渲染失败不影响整体界面 |

---

## ✅ 十、典型场景

1. **AI 生成调查问卷**
   - AI 根据上下文生成问题 → 调用 `render-dynamic-gui` 展示
   - 用户填写 → 结果返回给 AI 分析

2. **AI 请求权限确认**
   - AI 生成"是否允许访问文件？"弹窗
   - 用户点击"同意" → 返回结果

3. **动态调试面板**
   - AI 检测到异常 → 生成调试 GUI → 弹出供用户操作

4. **个性化表单**
   - AI 根据用户画像生成定制表单

5. **组件扩展示例**
   - 自定义图表组件
   ```js
   // 在 renderer.js 的 createComponent 函数中添加
   case 'chart':
     el = document.createElement('div');
     el.id = comp.id || `chart_${Date.now()}`;
     el.className = comp.className || 'chart-container';
     
     // 在下一个事件循环中初始化图表，确保DOM已渲染
     setTimeout(() => {
       try {
         // 使用第三方库如 Chart.js
         const ctx = document.getElementById(el.id).getContext('2d');
         new Chart(ctx, {
           type: comp.chartType || 'bar',
           data: comp.data || {},
           options: comp.options || {}
         });
       } catch (err) {
         console.error('图表渲染失败:', err);
         el.textContent = '图表加载失败';
         el.className += ' p-3 text-red-500 border border-red-300';
       }
     }, 0);
     break;
   ```

6. **动态主题切换**
   - AI 根据用户偏好或时间自动切换界面主题
   ```js
   // 示例回调
   "switchTheme": `
     const isDark = data.theme === 'dark';
     document.body.classList.toggle('dark-theme', isDark);
     document.body.classList.toggle('light-theme', !isDark);
     sendResult({ theme: isDark ? 'dark' : 'light' });
   `
   ```

---

## ✅ 十一、组件容错与错误处理

NexusGUI 实现了全面的组件容错机制，确保即使在组件定义不完整或存在错误的情况下，整个界面仍能正常渲染。

### 容错策略

| 错误类型 | 处理方式 | 效果 |
|---------|---------|------|
| **组件类型未知** | 渲染警告提示组件 | 显示黄色警告框，不影响其他组件 |
| **组件属性缺失** | 使用合理默认值 | 组件仍能渲染，使用默认值代替 |
| **组件渲染异常** | 捕获异常并显示错误组件 | 红色错误提示替代失败组件 |
| **回调执行失败** | 捕获异常并显示错误信息 | 用户操作不会导致整个界面崩溃 |
| **子组件渲染失败** | 仅影响该子组件 | 父容器和其他子组件正常显示 |

### 关键实现

1. **全局错误边界**
   ```js
   try {
     const el = createComponent(comp, config.callbacks);
     if (el) app.appendChild(el);
   } catch (error) {
     // 添加错误提示组件替代失败的组件
     const errorEl = createErrorComponent(comp, error);
     app.appendChild(errorEl);
   }
   ```

2. **组件级防御性编程**
   ```js
   // 属性默认值
   el.textContent = comp.text || '默认文本';
   
   // 类型检查
   if (!comp || typeof comp !== 'object') {
     throw new Error('无效的组件定义');
   }
   
   // 数组安全遍历
   if (Array.isArray(comp.options)) {
     // 处理选项...
   }
   ```

3. **错误可视化**
   - 未知组件显示为黄色警告框
   - 渲染失败显示为红色错误框
   - 错误信息包含组件类型和具体错误

### 优势

- ✅ **提高系统稳定性** - 单个组件错误不会导致整个界面崩溃
- ✅ **增强用户体验** - 即使有错误也能展示大部分功能
- ✅ **便于调试** - 直观显示错误信息，方便定位问题
- ✅ **适应AI生成内容** - 更好地容忍AI可能生成的不完美组件定义

---

## ✅ 十二、总结

> **NexusGUI v5.0 实现了"AI 生成界面，桌面端渲染"的终极动态架构**：

- ✅ 不再需要预定义 `.jsx` 文件
- ✅ GUI 完全由 AI 在运行时生成并传递
- ✅ 桌面端成为"智能 GUI 渲染器"
- ✅ 真正的 **AI 与桌面深度融合**
- ✅ 丰富的组件库满足各类界面需求
- ✅ 强大的容错机制确保界面稳定性
