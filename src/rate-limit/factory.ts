import type { RateLimitEngine } from "./limiter-interface";

import type {
  RateLimitPolicy,
  RateLimitStore,
} from "./types";

import { RateLimiter } from "./limiter";
import { TokenBucketLimiter } from "./token-bucket-limiter";
import { LeakyBucketLimiter } from "./leaky-bucket-limiter";

import type { TokenBucketStore } from "./token-bucket";
import type { LeakyBucketStore } from "./leaky-bucket";

export type RateLimitFactoryDependencies = {
  fixedWindowStore: RateLimitStore;
  tokenBucketStore: TokenBucketStore;
  leakyBucketStore: LeakyBucketStore;
};

export const createRateLimitEngine = (
  policy: RateLimitPolicy,
  dependencies: RateLimitFactoryDependencies,
): RateLimitEngine => {
  switch (policy.algorithm) {
    case "fixed-window":
      return new RateLimiter(
        dependencies.fixedWindowStore,
      );

    case "token-bucket":
      return new TokenBucketLimiter(
        dependencies.tokenBucketStore,
      );

    case "leaky-bucket":
      return new LeakyBucketLimiter(
        dependencies.leakyBucketStore,
      );

    default:
      throw new Error(
        "Unsupported rate limit algorithm",
      );
  }
};