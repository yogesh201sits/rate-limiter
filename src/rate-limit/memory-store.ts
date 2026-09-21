import type { RateLimitStore } from "./types";

type Entry = {
  count: number;
  resetAt: number;
};

export class MemoryStore implements RateLimitStore {
  private readonly store = new Map<string, Entry>();

  async increment(
    key: string,
    windowSeconds: number,
  ): Promise<{
    count: number;
    resetAt: number;
  }> {
    const now = Date.now();

    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowSeconds * 1000;

      const entry = {
        count: 1,
        resetAt,
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