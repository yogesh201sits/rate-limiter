import { Hono } from "hono";

import { RateLimiter } from "./rate-limit/limiter";
import { rateLimit } from "./rate-limit/middleware";
import { RedisStore } from "./rate-limit/redis-store";
import {
  getRateLimitPolicy,
} from "./rate-limit/policy";

const app = new Hono();

const store = new RedisStore();
const limiter = new RateLimiter(store);

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
    policy: getRateLimitPolicy("api"),
  }),
);

app.get("/api/test", (c) => {
  return c.json({
    message: "Request allowed",
  });
});

export default app;