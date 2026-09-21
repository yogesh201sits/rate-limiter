import { Hono } from "hono";

import { RateLimiter } from "./rate-limit/limiter";
import { rateLimit } from "./rate-limit/middleware";
import { resolvePolicy } from "./rate-limit/policy-resolver";
import { RedisStore } from "./rate-limit/redis-store";

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
    policy: resolvePolicy("api"),
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
  }),
);

app.get("/search/test", (c) => {
  return c.json({
    message: "Search request allowed",
  });
});

export default app;
