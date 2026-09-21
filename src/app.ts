import { Hono } from "hono";

import { RateLimiter } from "./rate-limit/limiter";
import { rateLimit } from "./rate-limit/middleware";
import { RedisStore } from "./rate-limit/redis-store";
import type { RateLimitPolicy } from "./rate-limit/types";

const app = new Hono();

const store = new RedisStore();
const limiter = new RateLimiter(store);

const policy: RateLimitPolicy = {
  name: "api",
  limit: 5,
  windowSeconds: 60,
};

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
    policy,
  }),
);

app.get("/api/test", (c) => {
  return c.json({
    message: "Request allowed",
  });
});

export default app;