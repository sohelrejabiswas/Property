import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Convenience only: sends visitors without a session cookie to the login page.
// The cookie is NOT trusted here. Every admin page, server action and API route
// verifies the signed session again on the server (requireAdmin / assertAdmin / getAdmin).
export function proxy(request: NextRequest) {
  if (!request.cookies.get("lm_session")?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/properties/:path*", "/settings/:path*"],
};
