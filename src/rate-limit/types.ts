export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitFailureMode =
  | "open"
  | "closed";

export interface RateLimitStore {
  increment(
    key: string,
    windowSeconds: number,
    policyName: string,
  ): Promise<{
    count: number;
    resetAt: number;
  }>;

  reset(
    key: string,
    policyName: string,
  ): Promise<void>;
}

export type TokenBucketConfig = {
  capacity: number;
  refillRate: number;
};

export type TokenBucketState = {
  tokens: number;
  lastRefillAt: number;
};