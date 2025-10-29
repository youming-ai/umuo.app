// 设置全局 polyfill 的服务器启动文件
// 这个文件在任何 Next.js 代码执行前运行

// 立即设置全局变量
if (typeof globalThis !== 'undefined') {
  globalThis.self = globalThis;
  globalThis.window = globalThis;
  globalThis.webpackChunk_N_E = globalThis.webpackChunk_N_E || [];
}

if (typeof global !== 'undefined') {
  global.self = global;
  global.window = global;
  global.webpackChunk_N_E = global.webpackChunk_N_E || [];
}

// 确保在模块级别也可以访问
if (typeof webpackChunk_N_E === 'undefined') {
  var webpackChunk_N_E = (typeof globalThis !== 'undefined' && globalThis.webpackChunk_N_E) ||
                         (typeof global !== 'undefined' && global.webpackChunk_N_E) ||
                         [];
}

// 设置 self 和 window 作为 globalThis 的别名
if (typeof self === 'undefined') {
  self = globalThis || global;
}

if (typeof window === 'undefined') {
  window = globalThis || global;
}

// 现在加载 Next.js
const { createServer } = require('next');
const { parse } = require('url');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

// 创建 Next.js 应用
const app = createServer({
  dev,
  hostname,
  port,
});

// 启动服务器
app.prepare().then(() => {
  require('http').createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      app.handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
