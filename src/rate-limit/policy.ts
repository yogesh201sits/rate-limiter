import type { RateLimitPolicy } from "./types";

export const rateLimitPolicies = {
  api: {
    name: "api",
    algorithm: "fixed-window",
    config: {
      limit: 100,
      windowSeconds: 60,
    },
  },

  auth: {
    name: "auth",
    algorithm: "fixed-window",
    config: {
      limit: 5,
      windowSeconds: 60,
    },
  },

  search: {
    name: "search",
    algorithm: "fixed-window",
    config: {
      limit: 30,
      windowSeconds: 60,
    },
  },

  burst: {
    name: "burst",
    algorithm: "token-bucket",
    config: {
      capacity: 10,
      refillRate: 2,
    },
  },

  leaky: {
    name: "leaky",
    algorithm: "leaky-bucket",
    config: {
      capacity: 10,
      leakRate: 2,
    },
  },
  
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName =
  keyof typeof rateLimitPolicies;

export const getRateLimitPolicy = (
  name: RateLimitPolicyName,
): RateLimitPolicy => {
  return rateLimitPolicies[name];
};