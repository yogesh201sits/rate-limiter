import type {
  TokenBucketConfig,
  TokenBucketResult,
  TokenBucketStore,
} from "./token-bucket";

type TokenBucketState = {
  tokens: number;
  lastRefillAt: number;
};

export class MemoryTokenBucketStore
  implements TokenBucketStore
{
  private readonly store = new Map<
    string,
    TokenBucketState
  >();

  async consume(
    key: string,
    config: TokenBucketConfig,
  ): Promise<TokenBucketResult> {
    const now = Date.now();

    const existing = this.store.get(key);

    if (!existing) {
      const state = {
        tokens: config.capacity - 1,
        lastRefillAt: now,
      };

      this.store.set(key, state);

      return {
        allowed: true,
        tokens: state.tokens,
      };
    }

    const elapsedSeconds =
      (now - existing.lastRefillAt) / 1000;

    const refilledTokens = Math.min(
      config.capacity,
      existing.tokens +
        elapsedSeconds * config.refillRate,
    );

    if (refilledTokens < 1) {
      const retryAfter = Math.ceil(
        (1 - refilledTokens) /
          config.refillRate,
      );

      existing.lastRefillAt = now;

      this.store.set(key, existing);

      return {
        allowed: false,
        tokens: refilledTokens,
        retryAfter,
      };
    }

    const newState = {
      tokens: refilledTokens - 1,
      lastRefillAt: now,
    };

    this.store.set(key, newState);

    return {
      allowed: true,
      tokens: newState.tokens,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}