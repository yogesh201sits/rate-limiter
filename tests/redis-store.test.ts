import {
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";

import { redis } from "../src/redis";
import { RedisStore } from "../src/rate-limit/redis-store";

beforeAll(async () => {
  await redis.ping();
});

describe("RedisStore", () => {
  test("increments a key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    const result = await store.increment(
      key,
      60,
      "test",
    );

    expect(result.count).toBe(1);
    expect(result.resetAt).toBeGreaterThan(Date.now());

    await store.reset(key, "test");
  });

  test("increments the same key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    const first = await store.increment(
      key,
      60,
      "test",
    );

    const second = await store.increment(
      key,
      60,
      "test",
    );

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);

    await store.reset(key, "test");
  });

  test("keeps different keys independent", async () => {
    const store = new RedisStore();

    const key1 = `test-${crypto.randomUUID()}`;
    const key2 = `test-${crypto.randomUUID()}`;

    const result1 = await store.increment(
      key1,
      60,
      "test",
    );

    const result2 = await store.increment(
      key2,
      60,
      "test",
    );

    expect(result1.count).toBe(1);
    expect(result2.count).toBe(1);

    await store.reset(key1, "test");
    await store.reset(key2, "test");
  });

  test("reset clears the key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    await store.increment(
      key,
      60,
      "test",
    );

    await store.increment(
      key,
      60,
      "test",
    );

    await store.reset(key, "test");

    const result = await store.increment(
      key,
      60,
      "test",
    );

    expect(result.count).toBe(1);

    await store.reset(key, "test");
  });

  test("handles concurrent increments atomically", async () => {
    const store = new RedisStore();
    const key = `concurrent-${crypto.randomUUID()}`;

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        store.increment(
          key,
          60,
          "concurrent",
        ),
      ),
    );

    const counts = results
      .map((result) => result.count)
      .sort((a, b) => a - b);

    expect(results).toHaveLength(100);

    expect(counts[0]).toBe(1);
    expect(counts[99]).toBe(100);

    const uniqueCounts = new Set(counts);

    expect(uniqueCounts.size).toBe(100);

    await store.reset(
      key,
      "concurrent",
    );
  });

  test("keeps different policies independent", async () => {
    const store = new RedisStore();
    const key = `policy-${crypto.randomUUID()}`;

    const apiFirst = await store.increment(
      key,
      60,
      "api",
    );

    const apiSecond = await store.increment(
      key,
      60,
      "api",
    );

    const authFirst = await store.increment(
      key,
      60,
      "auth",
    );

    expect(apiFirst.count).toBe(1);
    expect(apiSecond.count).toBe(2);

    expect(authFirst.count).toBe(1);

    await store.reset(key, "api");
    await store.reset(key, "auth");
  });
});