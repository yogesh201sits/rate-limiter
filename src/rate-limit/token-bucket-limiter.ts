import type {
  RateLimitPolicy,
  RateLimitResult,
} from "./types";
import type { RateLimitEngine } from "./limiter-interface";

import type { TokenBucketStore } from "./token-bucket";

export class TokenBucketLimiter implements RateLimitEngine {
  constructor(
    private readonly store: TokenBucketStore,
  ) {}

  async check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    if (policy.algorithm !== "token-bucket") {
      throw new Error(
        "TokenBucketLimiter requires a token-bucket policy",
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
        Math.max(result.tokens, 0),
      ),
      resetAt: Math.floor(
        Date.now() / 1000,
      ),
      retryAfter: result.retryAfter,
    };
  }
}