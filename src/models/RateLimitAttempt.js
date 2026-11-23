import mongoose from "mongoose";

// Backing store for rate limiting (spec 15.4: "Rate-limit login and
// sensitive endpoints"). One document per (scope, key) pair tracks a
// fixed-window attempt count. MongoDB-backed rather than in-memory so
// limits hold correctly across serverless cold starts and multiple
// instances (spec 10.1: Vercel or an equivalent Node.js platform).
const RateLimitAttemptSchema = new mongoose.Schema({
  scope: { type: String, required: true },
  key: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  windowStartsAt: { type: Date, required: true },
  // TTL index below removes the document shortly after the window ends -
  // the limiter never needs to read expired windows, and this keeps the
  // collection from growing unbounded.
  expiresAt: { type: Date, required: true },
});

// The document's real identity includes the window it belongs to - a
// (scope, key) pair has one active document per window, not one overall -
// so the unique index must match the upsert filter in rateLimitService.js
// exactly, or concurrent upserts for a new window can collide spuriously.
RateLimitAttemptSchema.index({ scope: 1, key: 1, windowStartsAt: 1 }, { unique: true });
RateLimitAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.RateLimitAttempt ||
  mongoose.model("RateLimitAttempt", RateLimitAttemptSchema);
