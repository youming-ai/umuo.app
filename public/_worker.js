// Simple Cloudflare Pages Functions worker for static Next.js export
export default {
  async fetch(request, env, ctx) {
    // For static export, let Cloudflare Pages handle the routing
    // The _redirects file will handle the routing logic
    return fetch(request);
  }
};