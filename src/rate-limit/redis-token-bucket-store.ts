import { redis } from "../redis";

import type {
  TokenBucketConfig,
  TokenBucketResult,
  TokenBucketStore,
} from "./token-bucket";

const CONSUME_SCRIPT = `
local key = KEYS[1]

local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])

local tokens = tonumber(redis.call("HGET", key, "tokens"))
local lastRefillAt = tonumber(
  redis.call("HGET", key, "lastRefillAt")
)

if tokens == nil then
  tokens = capacity
  lastRefillAt = now
end

local elapsedSeconds =
  (now - lastRefillAt) / 1000

tokens = math.min(
  capacity,
  tokens + elapsedSeconds * refillRate
)

local allowed = 0
local retryAfter = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retryAfter = math.ceil(
    (1 - tokens) / refillRate
  )
end

redis.call(
  "HSET",
  key,
  "tokens",
  tokens,
  "lastRefillAt",
  now
)

local ttl = math.ceil(
  capacity / refillRate
)

redis.call(
  "EXPIRE",
  key,
  ttl
)

return {
  allowed,
  tostring(tokens),
  retryAfter
}
`;

type RedisTokenBucketResult = [
  number,
  string,
  number,
];

const buildKey = (key: string) => {
  return `token-bucket:${key}`;
};

export class RedisTokenBucketStore
  implements TokenBucketStore
{
  async consume(
    key: string,
    config: TokenBucketConfig,
  ): Promise<TokenBucketResult> {
    const redisKey = buildKey(key);

    const result = (await redis.eval(
      CONSUME_SCRIPT,
      1,
      redisKey,
      Date.now(),
      config.capacity,
      config.refillRate,
    )) as RedisTokenBucketResult;

    const [
      allowed,
      tokens,
      retryAfter,
    ] = result;

    return {
      allowed: allowed === 1,
      tokens: Number(tokens),
      retryAfter:
        allowed === 1
          ? undefined
          : retryAfter,
    };
  }

  async reset(key: string): Promise<void> {
    await redis.del(buildKey(key));
  }
}