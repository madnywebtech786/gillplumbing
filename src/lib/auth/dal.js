import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongoose";
import User from "@/models/User";
import { readSessionCookie } from "@/lib/auth/session";
import { ROLES } from "@/constants/roles";

// Resolves the current user from the session cookie, re-checking isActive
// against the database so a deactivated account loses access immediately
// rather than only at next login. Cached per request with React's cache().
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await readSessionCookie();
  if (!session) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findById(session.userId).lean();

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}

export async function requireEmployee() {
  const user = await requireUser();
  if (user.role !== ROLES.EMPLOYEE && user.role !== ROLES.ADMIN) {
    throw new Error("Forbidden: employee access required");
  }
  return user;
}
