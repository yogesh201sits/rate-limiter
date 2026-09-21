import type {
  TokenBucketState,
  TokenBucketStore,
} from "./token-bucket";

export class MemoryTokenBucketStore
  implements TokenBucketStore
{
  private readonly store = new Map<
    string,
    TokenBucketState
  >();

  async get(
    key: string,
  ): Promise<TokenBucketState | null> {
    return this.store.get(key) ?? null;
  }

  async set(
    key: string,
    state: TokenBucketState,
  ): Promise<void> {
    this.store.set(key, state);
  }

  async reset(
    key: string,
  ): Promise<void> {
    this.store.delete(key);
  }
}