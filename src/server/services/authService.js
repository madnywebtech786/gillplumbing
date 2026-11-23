import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";

export async function authenticateWithCredentials(email, password) {
  await connectToDatabase();

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !user.isActive) {
    return { success: false, error: "Invalid email or password." };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return { success: false, error: "Invalid email or password." };
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    success: true,
    user: { id: user._id.toString(), role: user.role, name: user.name },
  };
}
