export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

export type RateLimitFailureMode =
  | "open"
  | "closed";

export type FixedWindowConfig = {
  limit: number;
  windowSeconds: number;
};

export type TokenBucketConfig = {
  capacity: number;
  refillRate: number;
};

export type RateLimitPolicy =
  | {
      name: string;
      algorithm: "fixed-window";
      config: FixedWindowConfig;
    }
  | {
      name: string;
      algorithm: "token-bucket";
      config: TokenBucketConfig;
    }
  | {
      name: string;
      algorithm: "leaky-bucket";
      config: LeakyBucketConfig;
    };

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

export type LeakyBucketConfig = {
  capacity: number;
  leakRate: number;
};
