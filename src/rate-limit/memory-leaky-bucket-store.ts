import type {
  LeakyBucketConfig,
} from "./types";

import type {
  LeakyBucketResult,
  LeakyBucketStore,
} from "./leaky-bucket";

type LeakyBucketState = {
  nextAvailableAt: number;
};

export class MemoryLeakyBucketStore
  implements LeakyBucketStore
{
  private readonly store = new Map<
    string,
    LeakyBucketState
  >();

  async consume(
    key: string,
    config: LeakyBucketConfig,
  ): Promise<LeakyBucketResult> {
    const now = Date.now();

    const leakInterval =
      1000 / config.leakRate;

    const existing = this.store.get(key);

    if (!existing) {
      this.store.set(key, {
        nextAvailableAt:
          now + leakInterval,
      });

      return {
        allowed: true,
        remaining: Math.max(
          config.capacity - 1,
          0,
        ),
      };
    }

    const queuedTime = Math.max(
      existing.nextAvailableAt - now,
      0,
    );

    const queuedRequests = Math.ceil(
      queuedTime / leakInterval,
    );

    if (queuedRequests >= config.capacity) {
      const retryAfter = Math.max(
        Math.ceil(queuedTime / 1000),
        1,
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    const nextAvailableAt =
      Math.max(
        existing.nextAvailableAt,
        now,
      ) + leakInterval;

    this.store.set(key, {
      nextAvailableAt,
    });

    const remaining = Math.max(
      config.capacity -
        queuedRequests -
        1,
      0,
    );

    return {
      allowed: true,
      remaining,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}