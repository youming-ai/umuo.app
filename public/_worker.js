// Cloudflare Pages Functions worker for Next.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 直接返回静态资源，让 Cloudflare Pages 处理
    try {
      let response = await fetch(request);

      // 如果成功，直接返回响应
      if (response.ok) {
        // 为特定文件类型设置正确的 MIME 类型
        const pathname = url.pathname;
        if (
          pathname.endsWith(".css") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "text/css");
        } else if (
          pathname.endsWith(".js") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "application/javascript");
        } else if (
          pathname.endsWith(".woff") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "font/woff");
        } else if (
          pathname.endsWith(".woff2") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "font/woff2");
        } else if (
          pathname.endsWith(".ttf") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "font/ttf");
        } else if (
          pathname.endsWith(".eot") &&
          !response.headers.get("Content-Type")
        ) {
          response = new Response(response.body, response);
          response.headers.set("Content-Type", "application/vnd.ms-fontobject");
        }
        return response;
      }

      // 如果响应状态不是 2xx，继续到错误处理
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      // 优雅的错误处理

      // 对于 API 路径，返回 JSON 错误
      if (url.pathname.startsWith("/api/")) {
        return new Response(
          JSON.stringify({
            error: "API endpoint not available",
            message: "The requested API endpoint is currently unavailable",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      // 对于静态资源文件，返回 404
      if (url.pathname.includes(".")) {
        return new Response("File not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      // 对于应用路由（SPA），尝试返回首页
      try {
        const indexResponse = await fetch(
          new Request(url.origin + "/", {
            method: "GET",
            headers: request.headers,
          }),
        );

        if (indexResponse.ok) {
          return indexResponse;
        }
      } catch (indexError) {
        console.error("Failed to fetch index page:", indexError);
      }

      // 最后的错误页面
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Temporarily Unavailable</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               margin: 0; padding: 40px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white;
                    padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #555; line-height: 1.6; }
        .retry-btn { display: inline-block; background: #3498db; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 4px;
                    margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Service Temporarily Unavailable</h1>
        <p>The application is currently experiencing difficulties. Please try again in a few moments.</p>
        <p>If the problem persists, please check your connection or contact support.</p>
        <a href="/" class="retry-btn">Try Again</a>
    </div>
</body>
</html>`,
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      );
    }
  },
};
