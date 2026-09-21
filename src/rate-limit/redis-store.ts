import type { RateLimitStore } from "./types";
import { redis } from "../redis";

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])

if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end

local ttl = redis.call("TTL", KEYS[1])

return { count, ttl }
`;

type RedisResult = [number, number];

const buildKey = (
  policyName: string,
  key: string,
) => {
  return `rate-limit:${policyName}:${key}`;
};

export class RedisStore implements RateLimitStore {
  async increment(
    key: string,
    windowSeconds: number,
    policyName: string,
  ): Promise<{
    count: number;
    resetAt: number;
  }> {
    const redisKey = buildKey(
      policyName,
      key,
    );

    const result = (await redis.eval(
      INCREMENT_SCRIPT,
      1,
      redisKey,
      windowSeconds,
    )) as RedisResult;

    const [count, ttl] = result;

    return {
      count,
      resetAt: Date.now() + ttl * 1000,
    };
  }

  async reset(
    key: string,
    policyName: string,
  ): Promise<void> {
    await redis.del(
      buildKey(policyName, key),
    );
  }
}