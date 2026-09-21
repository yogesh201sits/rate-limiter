import type {
  RateLimitEntry,
  RateLimitStore,
} from "./types";

export class MemoryStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  async increment(
    key: string,
    windowSeconds: number,
  ): Promise<RateLimitEntry> {
    const now = Date.now();

    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      const entry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      };

      this.store.set(key, entry);

      return entry;
    }

    existing.count += 1;

    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}
