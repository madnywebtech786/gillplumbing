import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Optimistic, cookie-only auth redirect. This is a UX convenience, not the
// security boundary: every Server Action and data query re-verifies the
// session and re-checks isActive against the database via the DAL
// (src/lib/auth/dal.js), since proxy matcher gaps can silently skip
// coverage (Server Actions are POST requests to their page's route).
const PUBLIC_ROUTES = ["/login"];

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET);

async function hasValidSessionCookie(request) {
  const token = request.cookies.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthenticated = await hasValidSessionCookie(request);

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
