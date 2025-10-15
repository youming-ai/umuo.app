// Cloudflare Pages Functions worker for Next.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle static assets
    if (url.pathname.startsWith('/_next/') ||
        url.pathname.startsWith('/icon') ||
        url.pathname.startsWith('/manifest')) {
      return fetch(request);
    }

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      try {
        // Import and use the Next.js server
        const { server } = await import('./server.js');
        return server(request);
      } catch (error) {
        console.error('API route error:', error);
        return new Response('API Error', { status: 500 });
      }
    }

    // Handle all other routes with Next.js
    try {
      // Try to serve the index.html for client-side routing
      return fetch(new Request('/index.html', request));
    } catch (error) {
      console.error('Route handling error:', error);
      return new Response('Not Found', { status: 404 });
    }
  }
};