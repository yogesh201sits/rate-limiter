import type { RateLimitPolicy } from "./types";

export const rateLimitPolicies = {
  api: {
    name: "api",
    limit: 100,
    windowSeconds: 60,
  },

  auth: {
    name: "auth",
    limit: 5,
    windowSeconds: 60,
  },

  search: {
    name: "search",
    limit: 30,
    windowSeconds: 60,
  },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;

export const getRateLimitPolicy = (
  name: RateLimitPolicyName,
): RateLimitPolicy => {
  return rateLimitPolicies[name];
};