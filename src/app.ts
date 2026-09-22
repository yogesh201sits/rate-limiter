import { Hono } from "hono";

import { RateLimiter } from "./rate-limit/limiter";
import { rateLimit } from "./rate-limit/middleware";
import { resolvePolicy } from "./rate-limit/policy-resolver";
import { RedisStore } from "./rate-limit/redis-store";
import { RedisTokenBucketStore } from "./rate-limit/redis-token-bucket-store";
import { TokenBucketLimiter } from "./rate-limit/token-bucket-limiter";
import { tokenBucketRateLimit } from "./rate-limit/token-bucket-middleware";

const app = new Hono();


const store = new RedisStore();

const limiter = new RateLimiter(store);


const tokenBucketStore = new RedisTokenBucketStore();

const tokenBucketLimiter = new TokenBucketLimiter(
  tokenBucketStore,
);


app.get("/", (c) => {
  return c.json({
    name: "rate-limiter",
    status: "ok",
  });
});


app.use(
  "/api/*",
  rateLimit({
    limiter,
    policy: resolvePolicy("api"),
    failureMode: "closed",
  }),
);

app.get("/api/test", (c) => {
  return c.json({
    message: "API request allowed",
  });
});


app.use(
  "/auth/*",
  rateLimit({
    limiter,
    policy: resolvePolicy("auth"),
    failureMode: "closed",
  }),
);

app.get("/auth/test", (c) => {
  return c.json({
    message: "Auth request allowed",
  });
});


app.use(
  "/search/*",
  rateLimit({
    limiter,
    policy: resolvePolicy("search"),
    failureMode: "closed",
  }),
);

app.get("/search/test", (c) => {
  return c.json({
    message: "Search request allowed",
  });
});

app.use(
  "/burst/*",
  tokenBucketRateLimit({
    limiter: tokenBucketLimiter,
    config: {
      capacity: 10,
      refillRate: 2,
    },
    failureMode: "closed",
  }),
);

app.get("/burst/test", (c) => {
  return c.json({
    message: "Burst request allowed",
  });
});

export default app;
