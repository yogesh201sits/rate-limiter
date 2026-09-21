import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function createRedisClient() {
  if (redisUrl) {
    return new Redis(redisUrl);
  }

  if (!restUrl || !restToken) {
    throw new Error(
      "Configure REDIS_URL or both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
  }

  const url = new URL(restUrl);

  if (url.protocol !== "https:") {
    throw new Error("UPSTASH_REDIS_REST_URL must use https://");
  }

  return new Redis({
    host: url.hostname,
    port: 6379,
    username: "default",
    password: restToken,
    tls: {},
  });
}

export const redis = createRedisClient();

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});