import {
  getRateLimitPolicy,
  type RateLimitPolicyName,
} from "./policy";
import type { RateLimitPolicy } from "./types";

export type PolicyResolver = (
  policyName: RateLimitPolicyName,
) => RateLimitPolicy;

export const resolvePolicy: PolicyResolver = (
  policyName,
) => {
  return getRateLimitPolicy(policyName);
};