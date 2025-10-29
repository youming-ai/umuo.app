// Custom webpack plugin to fix 'self is not defined' error in server builds
class SelfPolyfillPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('SelfPolyfillPlugin', (params, callback) => {
      // Set global variables before compilation
      if (typeof global !== 'undefined') {
        global.self = global.globalThis || global;
        global.window = global.globalThis || global;
        if (!global.globalThis.webpackChunk_N_E) {
          global.globalThis.webpackChunk_N_E = [];
        }
      }
      callback();
    });

    compiler.hooks.compilation.tap('SelfPolyfillPlugin', (compilation) => {
      compilation.mainTemplate.hooks.require.tap(
        'SelfPolyfillPlugin',
        (source, chunk) => {
          // Inject polyfill code at the top of each chunk
          const polyfillCode = `
// Fix for 'self is not defined' in server environment
if (typeof self === 'undefined') {
  var self = globalThis || global;
}
if (typeof window === 'undefined') {
  var window = globalThis || global;
}
if (!globalThis.webpackChunk_N_E) {
  globalThis.webpackChunk_N_E = [];
}
`;
          return polyfillCode + source;
        }
      );
    });
  }
}

module.exports = SelfPolyfillPlugin;
