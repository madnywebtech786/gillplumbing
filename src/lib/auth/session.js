import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("Missing required environment variable: AUTH_SECRET");
}

const encodedKey = new TextEncoder().encode(secret);

export async function createSessionToken({ userId, role }) {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(encodedKey);
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    if (!payload?.userId || !payload?.role) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function createSessionCookie({ userId, role }) {
  const token = await createSessionToken({ userId, role });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function readSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
