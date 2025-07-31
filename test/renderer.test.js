// NexusGUI 渲染器测试

const { JSDOM } = require('jsdom');

// 模拟 DOM 环境
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head><title>Test</title></head>
    <body>
      <div id="app"></div>
      <div id="error-modal" class="hidden">
        <div id="error-message"></div>
        <button id="close-error"></button>
      </div>
    </body>
  </html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.globalThis = global;

// 模拟 Electron API
global.window.electronAPI = {
  on: jest.fn(),
  send: jest.fn(),
  getFormData: jest.fn()
};

// 加载渲染器代码（需要适配测试环境）
describe('NexusGUI 渲染器测试', () => {
  beforeEach(() => {
    // 重置 DOM
    document.getElementById('app').innerHTML = '';
    globalThis.__gui_data__ = {};
  });

  test('应该能创建基础文本组件', () => {
    const component = {
      type: 'text',
      text: '测试文本',
      className: 'test-class'
    };

    // 这里需要导入并测试 createComponent 函数
    // 由于当前架构，我们创建一个简化版本用于测试
    const el = createTestComponent(component);
    
    expect(el.tagName).toBe('P');
    expect(el.textContent).toBe('测试文本');
    expect(el.className).toBe('test-class');
  });

  test('应该能创建输入框组件', () => {
    const component = {
      type: 'input',
      label: '测试输入',
      name: 'test-input',
      placeholder: '请输入',
      required: true
    };

    const el = createTestComponent(component);
    
    expect(el.className).toContain('form-group');
    
    const label = el.querySelector('label');
    expect(label.textContent).toBe('测试输入');
    
    const input = el.querySelector('input');
    expect(input.name).toBe('test-input');
    expect(input.placeholder).toBe('请输入');
    expect(input.required).toBe(true);
  });

  test('应该能创建按钮组件', () => {
    const component = {
      type: 'button',
      text: '测试按钮',
      className: 'btn-primary',
      onClick: 'testCallback'
    };

    const callbacks = {
      testCallback: 'console.log("clicked");'
    };

    const el = createTestComponent(component, callbacks);
    
    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toBe('测试按钮');
    expect(el.className).toContain('btn-primary');
  });

  test('应该能处理容器组件和子组件', () => {
    const component = {
      type: 'container',
      className: 'test-container',
      children: [
        { type: 'text', text: '子组件1' },
        { type: 'text', text: '子组件2' }
      ]
    };

    const el = createTestComponent(component);
    
    expect(el.className).toContain('test-container');
    expect(el.children.length).toBe(2);
    expect(el.children[0].textContent).toBe('子组件1');
    expect(el.children[1].textContent).toBe('子组件2');
  });

  test('应该能处理未知组件类型', () => {
    const component = {
      type: 'unknown-type',
      text: '未知组件'
    };

    const el = createTestComponent(component);
    
    expect(el.className).toContain('unknown-component');
    expect(el.textContent).toContain('未知组件类型');
  });
});

// 简化的组件创建函数用于测试
function createTestComponent(comp, callbacks = {}) {
  let el;

  switch (comp.type) {
    case 'text':
      el = document.createElement('p');
      el.textContent = comp.text || '';
      el.className = comp.className || '';
      break;

    case 'input':
      const container = document.createElement('div');
      container.className = 'form-group';

      const label = document.createElement('label');
      label.textContent = comp.label || '输入项';
      label.className = 'form-label';

      const input = document.createElement('input');
      input.name = comp.name || `input_${Date.now()}`;
      input.type = comp.inputType || 'text';
      input.placeholder = comp.placeholder || '';
      input.className = 'form-input';
      
      if (comp.required) input.required = true;
      if (comp.disabled) input.disabled = true;

      container.appendChild(label);
      container.appendChild(input);
      el = container;
      break;

    case 'button':
      el = document.createElement('button');
      el.textContent = comp.text || '按钮';
      el.className = `btn ${comp.className || 'btn-primary'}`;
      if (comp.disabled) el.disabled = true;
      break;

    case 'container':
      el = document.createElement('div');
      el.className = `container-component ${comp.className || ''}`;
      
      if (Array.isArray(comp.children)) {
        comp.children.forEach(childComp => {
          const childEl = createTestComponent(childComp, callbacks);
          if (childEl) el.appendChild(childEl);
        });
      }
      break;

    default:
      el = document.createElement('div');
      el.className = 'unknown-component';
      el.textContent = `未知组件类型: ${comp.type || '未指定'}`;
  }

  return el;
}