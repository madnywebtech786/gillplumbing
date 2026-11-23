import "server-only";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongoose";
import RateLimitAttempt from "@/models/RateLimitAttempt";

// Best-effort client IP for rate-limit keying. Trusts the platform's own
// forwarding header (set by Vercel/most reverse proxies, not user-supplied
// in that deployment model); falls back to a constant key if unavailable,
// which degrades to a single shared limit rather than no limit at all.
export async function getClientIp() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") || "unknown";
}

// Fixed-window rate limiter: counts attempts for (scope, key) within the
// current windowSeconds-wide window. Returns { allowed, remaining,
// retryAfterSeconds }. Atomic via findOneAndUpdate + $inc, so concurrent
// requests cannot race past the limit.
export async function checkRateLimit(scope, key, { maxAttempts, windowSeconds }) {
  await connectToDatabase();

  const now = new Date();
  const windowMs = windowSeconds * 1000;
  const windowStartsAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(windowStartsAt.getTime() + windowMs);

  const existing = await RateLimitAttempt.findOne({ scope, key }).lean();

  // A previous window's document is still present (its TTL hasn't fired
  // yet) - treat it as a fresh window rather than carrying its count over.
  if (existing && existing.windowStartsAt.getTime() < windowStartsAt.getTime()) {
    await RateLimitAttempt.deleteOne({ scope, key, windowStartsAt: existing.windowStartsAt });
  }

  // Two concurrent first-attempts-in-a-window both upserting the same new
  // (scope, key, windowStartsAt) document can race: MongoDB guarantees only
  // one insert wins, and the other gets a duplicate-key error rather than
  // silently retrying. One retry is enough since the second attempt always
  // finds the now-existing document and updates it instead of inserting.
  let updated;
  try {
    updated = await RateLimitAttempt.findOneAndUpdate(
      { scope, key, windowStartsAt },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
    updated = await RateLimitAttempt.findOneAndUpdate(
      { scope, key, windowStartsAt },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" }
    );
  }

  const allowed = updated.count <= maxAttempts;
  const retryAfterSeconds = allowed ? 0 : Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

  return {
    allowed,
    remaining: Math.max(0, maxAttempts - updated.count),
    retryAfterSeconds,
  };
}
