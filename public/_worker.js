// Cloudflare Pages Functions worker for Next.js standard build
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle API routes - return proper error response
    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'API routes are not available in this deployment'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // For static assets and pages, let Cloudflare handle them
    return fetch(request);
  }
};