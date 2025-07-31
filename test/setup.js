// Jest 测试环境设置

// 模拟 Electron API
global.window = global.window || {};
global.document = global.document || {};

// 模拟 electronAPI
global.window.electronAPI = {
  on: jest.fn(),
  send: jest.fn(),
  getFormData: jest.fn(),
  removeAllListeners: jest.fn()
};

// 模拟 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模拟 alert 和 confirm
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// 模拟 console 方法（可选，用于测试时减少输出）
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// 设置测试超时
jest.setTimeout(10000);

console.log('🧪 Jest 测试环境已设置');