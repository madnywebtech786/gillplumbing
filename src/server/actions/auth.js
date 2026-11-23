"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateWithCredentials } from "@/server/services/authService";
import { createSessionCookie, deleteSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/server/services/rateLimitService";

// Rate-limited by both IP and email (spec 15.4): IP limiting slows a single
// source hammering many accounts; email limiting slows distributed attempts
// against one account from many sources. Limits apply before password
// verification runs, so a lockout can't be bypassed by retrying faster than
// bcrypt's own cost factor would otherwise allow.
const LOGIN_RATE_LIMIT = { maxAttempts: 10, windowSeconds: 15 * 60 };

export async function loginAction(_prevState, formData) {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email, password } = validatedFields.data;

  const clientIp = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit("login-ip", clientIp, LOGIN_RATE_LIMIT),
    checkRateLimit("login-email", email, LOGIN_RATE_LIMIT),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  let result;
  try {
    result = await authenticateWithCredentials(email, password);
  } catch {
    return { error: "Something went wrong. Please try again." };
  }

  if (!result.success) {
    return { error: result.error };
  }

  await createSessionCookie({ userId: result.user.id, role: result.user.role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSessionCookie();
  redirect("/login");
}
