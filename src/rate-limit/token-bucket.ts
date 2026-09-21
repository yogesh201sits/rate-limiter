export type TokenBucketConfig = {
  capacity: number;
  refillRate: number;
};

export type TokenBucketState = {
  tokens: number;
  lastRefillAt: number;
};

export interface TokenBucketStore {
  get(
    key: string,
  ): Promise<TokenBucketState | null>;

  set(
    key: string,
    state: TokenBucketState,
  ): Promise<void>;

  reset(
    key: string,
  ): Promise<void>;
}