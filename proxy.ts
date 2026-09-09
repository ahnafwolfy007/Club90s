import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Lightweight, cookie-presence-only gate for UX (redirect before rendering).
// This is NOT the security boundary — every Server Component and Route
// Handler re-validates the session against the DB and re-checks permissions
// (SRS §7.3). A missing/expired session here just means a redirect either
// way; nothing here is trusted for authorization decisions.
const PUBLIC_PATHS = ["/login", "/activate", "/reset"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude API routes, Next internals, and any path with a file extension
  // (icons, manifest.webmanifest, sw.js, logo.png, ...) — those are static
  // assets, not app pages, and must never get redirected to /login.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
