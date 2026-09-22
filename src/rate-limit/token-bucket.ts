import type { TokenBucketConfig } from "./types";

export type { TokenBucketConfig } from "./types";

export type TokenBucketResult = {
  allowed: boolean;
  tokens: number;
  retryAfter?: number;
};

export interface TokenBucketStore {
  consume(
    key: string,
    config: TokenBucketConfig,
  ): Promise<TokenBucketResult>;

  reset(key: string): Promise<void>;
}