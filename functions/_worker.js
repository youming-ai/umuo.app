// 最小化测试 Worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 简单的路由测试
    if (url.pathname === "/test") {
      return new Response(
        JSON.stringify({
          message: "Pages Functions is working!",
          timestamp: new Date().toISOString(),
          services: {
            db: env.DB ? "DB Available" : "DB Missing",
            cache: env.CACHE ? "Cache Available" : "Cache Missing",
            files: env.FILES ? "Files Available" : "Files Missing",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // 健康检查
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // 默认响应
    return new Response(
      JSON.stringify({
        message: "umuo.app Pages Functions",
        path: url.pathname,
        status: "running",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
};
