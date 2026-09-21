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

export interface RateLimitStore {
  increment(
    key: string,
    windowSeconds: number,
  ): Promise<{
    count: number;
    resetAt: number;
  }>;

  reset(key: string): Promise<void>;
}