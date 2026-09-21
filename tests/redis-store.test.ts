import { describe, expect, test } from "bun:test";

import { RedisStore } from "../src/rate-limit/redis-store";

describe("RedisStore", () => {
  test("increments a key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    const first = await store.increment(key, 60);

    expect(first.count).toBe(1);
    expect(first.resetAt).toBeGreaterThan(Date.now());

    await store.reset(key);
  });

  test("increments the same key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    const first = await store.increment(key, 60);
    const second = await store.increment(key, 60);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);

    expect(second.resetAt).toBeGreaterThan(Date.now());

    await store.reset(key);
  });

  test("keeps different keys independent", async () => {
    const store = new RedisStore();

    const key1 = `test-${crypto.randomUUID()}`;
    const key2 = `test-${crypto.randomUUID()}`;

    const result1 = await store.increment(key1, 60);
    const result2 = await store.increment(key2, 60);

    expect(result1.count).toBe(1);
    expect(result2.count).toBe(1);

    await store.reset(key1);
    await store.reset(key2);
  });

  test("reset clears the key", async () => {
    const store = new RedisStore();
    const key = `test-${crypto.randomUUID()}`;

    await store.increment(key, 60);
    await store.increment(key, 60);

    await store.reset(key);

    const result = await store.increment(key, 60);

    expect(result.count).toBe(1);

    await store.reset(key);
  });
});