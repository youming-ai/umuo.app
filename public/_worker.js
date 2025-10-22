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

    // Handle static assets with correct MIME types
    let response = await fetch(request);

    // Clone the response to modify headers
    response = new Response(response.body, response);

    // Set correct Content-Type based on file extension
    if (pathname.endsWith('.css')) {
      response.headers.set('Content-Type', 'text/css');
    } else if (pathname.endsWith('.js')) {
      response.headers.set('Content-Type', 'application/javascript');
    } else if (pathname.endsWith('.woff')) {
      response.headers.set('Content-Type', 'font/woff');
    } else if (pathname.endsWith('.woff2')) {
      response.headers.set('Content-Type', 'font/woff2');
    } else if (pathname.endsWith('.ttf')) {
      response.headers.set('Content-Type', 'font/ttf');
    } else if (pathname.endsWith('.eot')) {
      response.headers.set('Content-Type', 'application/vnd.ms-fontobject');
    }

    return response;
  }
};