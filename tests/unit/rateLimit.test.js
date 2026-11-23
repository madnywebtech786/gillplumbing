import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/server/services/rateLimitService";

describe("checkRateLimit", () => {
  it("allows attempts up to the configured maximum", async () => {
    const key = `test-key-${Date.now()}-a`;
    for (let i = 0; i < 5; i += 1) {
      const result = await checkRateLimit("test-scope", key, { maxAttempts: 5, windowSeconds: 60 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the attempt once the maximum is exceeded", async () => {
    const key = `test-key-${Date.now()}-b`;
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit("test-scope", key, { maxAttempts: 3, windowSeconds: 60 });
    }
    const blocked = await checkRateLimit("test-scope", key, { maxAttempts: 3, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate scopes/keys independently", async () => {
    const keyA = `test-key-${Date.now()}-c`;
    const keyB = `test-key-${Date.now()}-d`;

    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit("scope-a", keyA, { maxAttempts: 3, windowSeconds: 60 });
    }
    const blockedA = await checkRateLimit("scope-a", keyA, { maxAttempts: 3, windowSeconds: 60 });
    const allowedB = await checkRateLimit("scope-b", keyB, { maxAttempts: 3, windowSeconds: 60 });

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it("does not let concurrent requests race past the limit", async () => {
    const key = `test-key-${Date.now()}-e`;
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => checkRateLimit("concurrent-scope", key, { maxAttempts: 5, windowSeconds: 60 }))
    );

    const allowedCount = attempts.filter((result) => result.allowed).length;
    expect(allowedCount).toBe(5);
  });
});
