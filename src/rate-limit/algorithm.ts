import type { RateLimitResult } from "./types";

export interface RateLimitAlgorithm {
  check(
    key: string,
  ): Promise<RateLimitResult>;
}