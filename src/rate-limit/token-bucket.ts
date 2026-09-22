export type TokenBucketConfig = {
  capacity: number;
  refillRate: number;
};

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