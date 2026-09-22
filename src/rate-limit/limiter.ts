import type {
  RateLimitPolicy,
  RateLimitResult,
  RateLimitStore,
} from "./types";
import type { RateLimitEngine } from "./limiter-interface";

export class RateLimiter implements RateLimitEngine {
  constructor(
    private readonly store: RateLimitStore,
  ) {}

  async check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    if (policy.algorithm !== "fixed-window") {
      throw new Error(
        "RateLimiter requires a fixed-window policy",
      );
    }

    const result = await this.store.increment(
      key,
      policy.config.windowSeconds,
      policy.name,
    );

    const allowed = result.count <= policy.config.limit;

    const remaining = Math.max(
      policy.config.limit - result.count,
      0,
    );

    const retryAfter = allowed
      ? undefined
      : Math.max(
          Math.ceil(
            (result.resetAt - Date.now()) / 1000,
          ),
          0,
        );

    return {
      allowed,
      limit: policy.config.limit,
      remaining,
      resetAt: Math.floor(
        result.resetAt / 1000,
      ),
      retryAfter,
    };
  }
}