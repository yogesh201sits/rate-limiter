import type { RateLimitEngine } from "./limiter-interface";
import type {
  RateLimitPolicy,
  RateLimitStore,
} from "./types";

import { RateLimiter } from "./limiter";
import { TokenBucketLimiter } from "./token-bucket-limiter";

import type { TokenBucketStore } from "./token-bucket";

export type RateLimitFactoryDependencies = {
  fixedWindowStore: RateLimitStore;
  tokenBucketStore: TokenBucketStore;
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

    default: {
      throw new Error("Unsupported rate limit algorithm");
    }
  }
};