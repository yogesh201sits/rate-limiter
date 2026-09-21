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

export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export interface RateLimitStore {
  increment(
    key: string,
    windowSeconds: number,
  ): Promise<RateLimitEntry>;

  reset(key: string): Promise<void>;
}