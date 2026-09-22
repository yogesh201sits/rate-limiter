import type {
  RateLimitPolicy,
  RateLimitResult,
} from "./types";

import type { RateLimitEngine } from "./limiter-interface";

import type { LeakyBucketStore } from "./leaky-bucket";

export class LeakyBucketLimiter
  implements RateLimitEngine
{
  constructor(
    private readonly store: LeakyBucketStore,
  ) {}

  async check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    if (policy.algorithm !== "leaky-bucket") {
      throw new Error(
        "LeakyBucketLimiter requires a leaky-bucket policy",
      );
    }

    const result = await this.store.consume(
      key,
      policy.config,
    );

    return {
      allowed: result.allowed,
      limit: policy.config.capacity,
      remaining: Math.floor(
        Math.max(result.remaining, 0),
      ),
      resetAt: Math.floor(
        result.resetAt / 1000,
      ),
      retryAfter: result.retryAfter,
    };
  }
}