import type {
  RateLimitPolicy,
  RateLimitResult,
} from "./types";

export interface RateLimitEngine {
  check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult>;
}