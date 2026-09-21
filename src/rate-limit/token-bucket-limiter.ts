import type {
  RateLimitResult,
} from "./types";

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
    const now = Date.now();

    const existing = await this.store.get(key);

    const state = existing ?? {
      tokens: config.capacity,
      lastRefillAt: now,
    };

    const elapsedSeconds =
      (now - state.lastRefillAt) / 1000;

    const refilledTokens = Math.min(
      config.capacity,
      state.tokens +
        elapsedSeconds * config.refillRate,
    );

    const allowed = refilledTokens >= 1;

    const tokens = allowed
      ? refilledTokens - 1
      : refilledTokens;

    await this.store.set(key, {
      tokens,
      lastRefillAt: now,
    });

    const remaining = Math.floor(tokens);

    const retryAfter = allowed
      ? undefined
      : Math.ceil(
          (1 - tokens) /
            config.refillRate,
        );

    return {
      allowed,
      limit: config.capacity,
      remaining,
      resetAt: Math.floor(
        (
          now +
          (
            (config.capacity - tokens) /
            config.refillRate
          ) *
            1000
        ) / 1000,
      ),
      retryAfter,
    };
  }
}