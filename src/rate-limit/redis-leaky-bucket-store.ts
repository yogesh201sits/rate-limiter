import { redis } from "../redis";

import type {
  LeakyBucketConfig,
} from "./types";

import type {
  LeakyBucketResult,
  LeakyBucketStore,
} from "./leaky-bucket";

/**
 * The bucket stores the theoretical time at which
 * the next accepted request can leave the bucket.
 *
 * Redis TIME is used so all application instances
 * share the same clock.
 */
const CONSUME_SCRIPT = `
local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local leakRate = tonumber(ARGV[2])

local time = redis.call("TIME")

local now =
  tonumber(time[1]) * 1000 +
  math.floor(tonumber(time[2]) / 1000)

local leakInterval =
  1000 / leakRate

local nextAvailableAt =
  tonumber(redis.call("GET", key))

if nextAvailableAt == nil then
  nextAvailableAt =
    now + leakInterval

  redis.call(
    "SET",
    key,
    nextAvailableAt
  )

  local ttl =
    math.max(
      math.ceil(
        (capacity + 1) / leakRate
      ),
      1
    )

  redis.call(
    "EXPIRE",
    key,
    ttl
  )

  return {
    1,
    capacity - 1,
    0
  }
end

local queuedTime =
  math.max(
    nextAvailableAt - now,
    0
  )

local queuedRequests =
  math.ceil(
    queuedTime / leakInterval
  )

if queuedRequests >= capacity then
  local retryAfter =
    math.max(
      math.ceil(
        queuedTime / 1000
      ),
      1
    )

  return {
    0,
    0,
    retryAfter
  }
end

local scheduledFrom =
  math.max(
    nextAvailableAt,
    now
  )

nextAvailableAt =
  scheduledFrom + leakInterval

redis.call(
  "SET",
  key,
  nextAvailableAt
)

local ttl =
  math.max(
    math.ceil(
      (capacity + 1) / leakRate
    ),
    1
  )

redis.call(
  "EXPIRE",
  key,
  ttl
)

local remaining =
  math.max(
    capacity -
      queuedRequests -
      1,
    0
  )

return {
  1,
  remaining,
  0
}
`;

type RedisLeakyBucketResult = [
  number,
  number,
  number,
];

const buildKey = (key: string) => {
  return `leaky-bucket:${key}`;
};

export class RedisLeakyBucketStore
  implements LeakyBucketStore
{
  async consume(
    key: string,
    config: LeakyBucketConfig,
  ): Promise<LeakyBucketResult> {
    const redisKey = buildKey(key);

    const result = (await redis.eval(
      CONSUME_SCRIPT,
      1,
      redisKey,
      config.capacity,
      config.leakRate,
    )) as RedisLeakyBucketResult;

    const [
      allowed,
      remaining,
      retryAfter,
    ] = result;

    return {
      allowed: allowed === 1,
      remaining,
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
