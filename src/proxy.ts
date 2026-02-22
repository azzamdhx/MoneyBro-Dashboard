import { NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-2fa"];
const PUBLIC_PAGES = ["/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasSession = !!(token || refreshToken);

  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  // Logged in user trying to access auth pages → redirect to dashboard
  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not logged in user trying to access protected pages → redirect to login
  if (!hasSession && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|favicon.ico|primary-logo.png|manifest.json|sw.js).*)",
  ],
};
