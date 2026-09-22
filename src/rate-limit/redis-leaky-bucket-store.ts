export type LeakyBucketConfig = {
  capacity: number;
  leakRate: number;
};

export type LeakyBucketResult = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
};

export interface LeakyBucketStore {
  consume(
    key: string,
    config: LeakyBucketConfig,
  ): Promise<LeakyBucketResult>;

  reset(key: string): Promise<void>;
}