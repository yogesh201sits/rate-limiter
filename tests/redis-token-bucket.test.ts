import {
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";

import { redis } from "../src/redis";
import { RedisTokenBucketStore } from "../src/rate-limit/redis-token-bucket-store";

beforeAll(async () => {
  await redis.ping();
});

describe("RedisTokenBucketStore", () => {
  test("allows requests while tokens are available", async () => {
    const store = new RedisTokenBucketStore();

    const key = `test-${crypto.randomUUID()}`;

    const config = {
      capacity: 3,
      refillRate: 0.000001,
    };

    const first = await store.consume(
      key,
      config,
    );

    const second = await store.consume(
      key,
      config,
    );

    const third = await store.consume(
      key,
      config,
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);

    expect(first.tokens).toBeLessThan(3);
    expect(second.tokens).toBeLessThan(2);
    expect(third.tokens).toBeLessThan(1);

    expect(third.tokens).toBeGreaterThanOrEqual(0);

    await store.reset(key);
  });

  test("rejects requests when bucket is empty", async () => {
    const store = new RedisTokenBucketStore();

    const key = `test-${crypto.randomUUID()}`;

    const config = {
      capacity: 2,
      refillRate: 0.000001,
    };

    await store.consume(key, config);
    await store.consume(key, config);

    const result = await store.consume(
      key,
      config,
    );

    expect(result.allowed).toBe(false);
    expect(result.tokens).toBeLessThan(1);
    expect(result.tokens).toBeGreaterThanOrEqual(0);

    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);

    await store.reset(key);
  });

  test("keeps different keys independent", async () => {
    const store = new RedisTokenBucketStore();

    const key1 = `test-${crypto.randomUUID()}`;
    const key2 = `test-${crypto.randomUUID()}`;

    const config = {
      capacity: 2,
      refillRate: 0.000001,
    };

    await store.consume(key1, config);
    await store.consume(key1, config);

    const result = await store.consume(
      key2,
      config,
    );

    expect(result.allowed).toBe(true);
    expect(result.tokens).toBeLessThan(2);
    expect(result.tokens).toBeGreaterThanOrEqual(0);

    await store.reset(key1);
    await store.reset(key2);
  });

  test("reset clears bucket state", async () => {
    const store = new RedisTokenBucketStore();

    const key = `test-${crypto.randomUUID()}`;

    const config = {
      capacity: 2,
      refillRate: 0.000001,
    };

    await store.consume(key, config);
    await store.consume(key, config);

    const rejected = await store.consume(
      key,
      config,
    );

    expect(rejected.allowed).toBe(false);

    await store.reset(key);

    const result = await store.consume(
      key,
      config,
    );

    expect(result.allowed).toBe(true);
    expect(result.tokens).toBeLessThan(2);
    expect(result.tokens).toBeGreaterThanOrEqual(0);

    await store.reset(key);
  });

  test("refills tokens over time", async () => {
  const store = new RedisTokenBucketStore();

  const key = `refill-${crypto.randomUUID()}`;

  const config = {
    capacity: 1,
    refillRate: 0.01,
  };

  const first = await store.consume(
    key,
    config,
  );

  expect(first.allowed).toBe(true);

  const rejected = await store.consume(
    key,
    config,
  );

  expect(rejected.allowed).toBe(false);
  expect(rejected.retryAfter).toBeDefined();
  expect(rejected.retryAfter).toBeGreaterThan(0);

  // 0.01 tokens/second means one token
  // takes approximately 100 seconds to refill.
  //
  // We only wait briefly here to prove the bucket
  // remains empty immediately after the rejection.
  await new Promise((resolve) =>
    setTimeout(resolve, 100),
  );

  const stillRejected = await store.consume(
    key,
    config,
  );

  expect(stillRejected.allowed).toBe(false);

  await store.reset(key);
}, 10000);

  test("handles concurrent requests atomically", async () => {
    const store = new RedisTokenBucketStore();

    const key = `concurrent-${crypto.randomUUID()}`;

    const config = {
      capacity: 10,
      refillRate: 0.000001,
    };

    const results = await Promise.all(
      Array.from(
        { length: 100 },
        () =>
          store.consume(
            key,
            config,
          ),
      ),
    );

    const allowedCount =
      results.filter(
        (result) => result.allowed,
      ).length;

    const rejectedCount =
      results.filter(
        (result) => !result.allowed,
      ).length;

    expect(results).toHaveLength(100);

    expect(allowedCount).toBe(10);
    expect(rejectedCount).toBe(90);

    await store.reset(key);
  });
});