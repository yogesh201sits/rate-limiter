import type { Context, Next } from "hono";

import {
  rateLimitAllowedTotal,
  rateLimitCheckDuration,
  rateLimitErrorsTotal,
  rateLimitRejectedTotal,
  rateLimitRequestsTotal,
} from "../observability/metrics";

import type {
  RateLimitFailureMode,
  RateLimitPolicy,
} from "./types";

import type { RateLimitEngine } from "./limiter-interface";

export type RateLimitMiddlewareOptions = {
  limiter: RateLimitEngine;
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

    const labels = {
      algorithm: policy.algorithm,
      policy: policy.name,
    };

    const endTimer =
      rateLimitCheckDuration.startTimer(
        labels,
      );

    rateLimitRequestsTotal.inc(labels);

    try {
      const result = await limiter.check(
        key,
        policy,
      );

      if (result.allowed) {
        rateLimitAllowedTotal.inc(labels);
      } else {
        rateLimitRejectedTotal.inc(labels);
      }

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
      rateLimitErrorsTotal.inc(labels);

      console.error(
        "Rate limiter storage error:",
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
    } finally {
      endTimer();
    }
  };
};