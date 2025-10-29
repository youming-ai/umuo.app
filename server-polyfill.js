// Node.js 环境的 polyfill - 解决 webpack 在服务器端的兼容性问题
// 这个文件必须在所有其他模块之前加载

// 设置基本的全局变量
if (typeof globalThis !== 'undefined') {
  // 确保 self 指向 globalThis
  if (!globalThis.self) {
    globalThis.self = globalThis;
  }

  // 确保 window 指向 globalThis（为了兼容性）
  if (!globalThis.window) {
    globalThis.window = globalThis;
  }

  // 初始化 webpackChunk_N_E
  if (!globalThis.webpackChunk_N_E) {
    globalThis.webpackChunk_N_E = [];
  }
}

// 确保 global 对象也有这些属性
if (typeof global !== 'undefined') {
  if (!global.self) {
    global.self = global;
  }

  if (!global.window) {
    global.window = global;
  }

  if (!global.webpackChunk_N_E) {
    global.webpackChunk_N_E = [];
  }
}

// 在模块级别定义 webpackChunk_N_E，确保它立即可用
var webpackChunk_N_E = (typeof globalThis !== 'undefined' && globalThis.webpackChunk_N_E) ||
                       (typeof global !== 'undefined' && global.webpackChunk_N_E) ||
                       [];

// 导出 polyfill 以确保模块系统正确加载
module.exports = {};
