// Cloudflare Pages Functions worker for Next.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle static assets with correct MIME types
    try {
      let response = await fetch(request);

      // Clone the response to modify headers
      response = new Response(response.body, response);

      // Set correct Content-Type based on file extension
      const pathname = url.pathname;
      if (pathname.endsWith(".css")) {
        response.headers.set("Content-Type", "text/css");
      } else if (pathname.endsWith(".js")) {
        response.headers.set("Content-Type", "application/javascript");
      } else if (pathname.endsWith(".woff")) {
        response.headers.set("Content-Type", "font/woff");
      } else if (pathname.endsWith(".woff2")) {
        response.headers.set("Content-Type", "font/woff2");
      } else if (pathname.endsWith(".ttf")) {
        response.headers.set("Content-Type", "font/ttf");
      } else if (pathname.endsWith(".eot")) {
        response.headers.set("Content-Type", "application/vnd.ms-fontobject");
      }

      return response;
    } catch (error) {
      // If file not found, try to serve index.html for SPA routing
      if (url.pathname.includes(".")) {
        return new Response("File not found", { status: 404 });
      }

      // For SPA routes, serve the main page
      try {
        const indexResponse = await fetch(
          new Request(url.origin + "/", request),
        );
        return indexResponse;
      } catch (indexError) {
        return new Response("Application not available", { status: 503 });
      }
    }
  },
};
