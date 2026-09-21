import type { RateLimitStore } from "./types";

type Entry = {
  count: number;
  resetAt: number;
};

const buildKey = (
  policyName: string,
  key: string,
) => {
  return `${policyName}:${key}`;
};

export class MemoryStore implements RateLimitStore {
  private readonly store = new Map<string, Entry>();

  async increment(
    key: string,
    windowSeconds: number,
    policyName: string,
  ): Promise<{
    count: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const storeKey = buildKey(policyName, key);

    const existing = this.store.get(storeKey);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowSeconds * 1000;

      const entry = {
        count: 1,
        resetAt,
      };

      this.store.set(storeKey, entry);

      return entry;
    }

    existing.count += 1;

    return existing;
  }

  async reset(
    key: string,
    policyName: string,
  ): Promise<void> {
    this.store.delete(
      buildKey(policyName, key),
    );
  }
}