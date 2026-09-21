import type {
  RateLimitPolicy,
  RateLimitResult,
  RateLimitStore,
} from "./types";

export class RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
  ) {}

  async check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    const result = await this.store.increment(
      key,
      policy.windowSeconds,
    );

    const allowed = result.count <= policy.limit;

    const remaining = Math.max(
      policy.limit - result.count,
      0,
    );

    const retryAfter = allowed
      ? undefined
      : Math.max(
          Math.ceil((result.resetAt - Date.now()) / 1000),
          0,
        );

    return {
      allowed,
      limit: policy.limit,
      remaining,
      resetAt: Math.floor(result.resetAt / 1000),
      retryAfter,
    };
  }
}