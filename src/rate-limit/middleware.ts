import type { Context, Next } from "hono";

import { RateLimiter } from "./limiter";
import type {
  RateLimitFailureMode,
  RateLimitPolicy,
} from "./types";

export type RateLimitMiddlewareOptions = {
  limiter: RateLimiter;
  policy: RateLimitPolicy;
  failureMode?: RateLimitFailureMode;
  keyGenerator?: (c: Context) => string;
};

export const rateLimit = ({
  limiter,
  policy,
  failureMode = "closed",
  keyGenerator = (c) =>
    c.req.header("x-client-id") ?? "anonymous",
}: RateLimitMiddlewareOptions) => {
  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);

    try {
      const result = await limiter.check(
        key,
        policy,
      );

      c.header(
        "X-RateLimit-Limit",
        String(result.limit),
      );

      c.header(
        "X-RateLimit-Remaining",
        String(result.remaining),
      );

      c.header(
        "X-RateLimit-Reset",
        String(result.resetAt),
      );

      if (!result.allowed) {
        if (result.retryAfter !== undefined) {
          c.header(
            "Retry-After",
            String(result.retryAfter),
          );
        }

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
        "Rate limiter storage error:",
        error,
      );

      if (failureMode === "open") {
        await next();
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