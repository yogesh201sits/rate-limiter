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
      const nextAvailableAt =
        now + leakInterval;

      this.store.set(key, {
        nextAvailableAt,
      });

      return {
        allowed: true,
        remaining: Math.max(
          config.capacity - 1,
          0,
        ),
        resetAt: nextAvailableAt,
      };
    }

    const queuedTime = Math.max(
      existing.nextAvailableAt - now,
      0,
    );

    const maxQueueTime =
      config.capacity * leakInterval;

    if (queuedTime >= maxQueueTime) {
      const retryAfter = Math.max(
        Math.ceil(
          (
            queuedTime -
            maxQueueTime +
            leakInterval
          ) / 1000,
        ),
        1,
      );

      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.nextAvailableAt,
        retryAfter,
      };
    }

    const queuedRequests = Math.floor(
      queuedTime / leakInterval,
    );

    const scheduledFrom = Math.max(
      existing.nextAvailableAt,
      now,
    );

    const nextAvailableAt =
      scheduledFrom + leakInterval;

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
      resetAt: nextAvailableAt,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}