import { describe, expect, test } from "bun:test";

import { RateLimiter } from "../src/rate-limit/limiter";
import { MemoryStore } from "../src/rate-limit/memory-store";
import type { RateLimitPolicy } from "../src/rate-limit/types";

const policy: RateLimitPolicy = {
  name: "test",
  algorithm: "fixed-window",
  config: {
    limit: 3,
    windowSeconds: 60,
  },
};

describe("RateLimiter", () => {
  test("allows requests within the limit", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    const result = await limiter.check("user-1", policy);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
  });

  test("rejects requests after the limit", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    await limiter.check("user-1", policy);
    await limiter.check("user-1", policy);
    await limiter.check("user-1", policy);

    const result = await limiter.check("user-1", policy);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test("tracks different keys independently", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    const user1 = await limiter.check("user-1", policy);
    const user2 = await limiter.check("user-2", policy);

    expect(user1.allowed).toBe(true);
    expect(user1.remaining).toBe(2);

    expect(user2.allowed).toBe(true);
    expect(user2.remaining).toBe(2);
  });

  test("remaining never becomes negative", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    for (let i = 0; i < 10; i++) {
      await limiter.check("user-1", policy);
    }

    const result = await limiter.check("user-1", policy);

    expect(result.remaining).toBe(0);
  });

  test("returns the same reset time within a window", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    const first = await limiter.check("user-1", policy);
    const second = await limiter.check("user-1", policy);

    expect(second.resetAt).toBe(first.resetAt);
  });

  test("uses a new window after expiration", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    const shortPolicy: RateLimitPolicy = {
      name: "short-test",
      algorithm: "fixed-window",
      config: {
        limit: 2,
        windowSeconds: 0.05,
      },
    };

    const first = await limiter.check(
      "user-1",
      shortPolicy,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 60),
    );

    const second = await limiter.check(
      "user-1",
      shortPolicy,
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  test("reset clears the rate-limit state", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    await limiter.check("user-1", policy);
    await limiter.check("user-1", policy);

    await store.reset("user-1", "test");

    const result = await limiter.check(
      "user-1",
      policy,
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  test("different policies have independent state", async () => {
    const store = new MemoryStore();
    const limiter = new RateLimiter(store);

    const apiPolicy: RateLimitPolicy = {
      name: "api",
      algorithm: "fixed-window",
      config: {
        limit: 3,
        windowSeconds: 60,
      },
    };

    const authPolicy: RateLimitPolicy = {
      name: "auth",
      algorithm: "fixed-window",
      config: {
        limit: 2,
        windowSeconds: 60,
      },
    };

    await limiter.check("user-1", apiPolicy);
    await limiter.check("user-1", apiPolicy);

    const authResult = await limiter.check(
      "user-1",
      authPolicy,
    );

    expect(authResult.allowed).toBe(true);
    expect(authResult.remaining).toBe(1);

    const apiResult = await limiter.check(
      "user-1",
      apiPolicy,
    );

    expect(apiResult.allowed).toBe(true);
    expect(apiResult.remaining).toBe(0);
  });
});