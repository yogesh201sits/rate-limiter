import type {
  LeakyBucketConfig,
} from "./types";

export type LeakyBucketResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

export interface LeakyBucketStore {
  consume(
    key: string,
    config: LeakyBucketConfig,
  ): Promise<LeakyBucketResult>;

  reset(key: string): Promise<void>;
}