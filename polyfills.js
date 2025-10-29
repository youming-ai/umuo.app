// Server-side polyfills - fix for 'self is not defined' error
// This file is loaded first in the server entry point

// Fix the main issue: self is not defined
global.self = globalThis || global;

// Fix window for compatibility
global.window = globalThis || global;

// Fix webpackChunk_N_E for webpack chunks
if (!globalThis.webpackChunk_N_E) {
  globalThis.webpackChunk_N_E = [];
}

// Additional polyfills for server compatibility
global.global = globalThis || global;

// Polyfill fetch if needed
if (typeof fetch === "undefined") {
  try {
    global.fetch = require("node-fetch");
  } catch (e) {
    // fallback if node-fetch not available
    console.warn("node-fetch not available, fetch polyfill skipped");
  }
}

// Polyfill AbortController if needed
if (typeof AbortController === "undefined") {
  try {
    const { AbortController } = require("node-abort-controller");
    global.AbortController = AbortController;
  } catch (e) {
    console.warn("AbortController polyfill not available");
  }
}

console.log("✅ Server-side polyfills loaded successfully");
