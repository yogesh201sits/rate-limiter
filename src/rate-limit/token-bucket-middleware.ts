import type { Context, Next } from "hono";

import { TokenBucketLimiter } from "./token-bucket-limiter";
import type {
  TokenBucketConfig,
} from "./token-bucket";
import type {
  RateLimitFailureMode,
} from "./types";

export type TokenBucketMiddlewareOptions = {
  limiter: TokenBucketLimiter;
  config: TokenBucketConfig;
  failureMode?: RateLimitFailureMode;
  keyGenerator?: (c: Context) => string;
};

export const tokenBucketRateLimit = ({
  limiter,
  config,
  failureMode = "closed",
  keyGenerator = (c) =>
    c.req.header("x-client-id") ?? "anonymous",
}: TokenBucketMiddlewareOptions) => {
  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);

    try {
      const result = await limiter.check(
        key,
        config,
      );

      c.header(
        "X-RateLimit-Limit",
        String(result.limit),
      );

      c.header(
        "X-RateLimit-Remaining",
        String(result.remaining),
      );

      if (result.retryAfter !== undefined) {
        c.header(
          "Retry-After",
          String(result.retryAfter),
        );
      }

      if (!result.allowed) {
        return c.json(
          {
            error: "rate_limit_exceeded",
            message: "Too many requests",
            retryAfter: result.retryAfter,
          },
          429,
        );
      }

      await next();
    } catch (error) {
      console.error(
        "Token bucket storage error:",
        error,
      );

      if (failureMode === "open") {
        await next();
        return;
      }

      return c.json(
        {
          error: "rate_limit_unavailable",
          message: "Rate limiter unavailable",
        },
        503,
      );
    }
  };
};