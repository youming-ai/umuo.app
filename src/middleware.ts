import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Theme detection middleware
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle theme preference from query params
  if (searchParams.has("theme")) {
    const theme = searchParams.get("theme");
    const response = NextResponse.redirect(new URL(pathname, request.url));

    if (theme && ["dark", "light", "system", "high-contrast"].includes(theme)) {
      response.cookies.set("theme", theme, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  }

  // Set security headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Add performance headers
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // API rate limiting headers (basic)
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", "99");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
