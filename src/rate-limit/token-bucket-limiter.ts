import type { RateLimitResult } from "./types";

import type {
  TokenBucketConfig,
  TokenBucketStore,
} from "./token-bucket";

export class TokenBucketLimiter {
  constructor(
    private readonly store: TokenBucketStore,
  ) {}

  async check(
    key: string,
    config: TokenBucketConfig,
  ): Promise<RateLimitResult> {
    const result = await this.store.consume(
      key,
      config,
    );

    return {
      allowed: result.allowed,
      limit: config.capacity,
      remaining: Math.floor(
        Math.max(result.tokens, 0),
      ),
      resetAt: Math.floor(
        Date.now() / 1000,
      ),
      retryAfter: result.retryAfter,
    };
  }
}