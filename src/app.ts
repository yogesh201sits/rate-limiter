import { Hono } from "hono";

import { MemoryStore } from "./rate-limit/memory-store";
import { RateLimiter } from "./rate-limit/limiter";
import { defaultPolicy } from "./rate-limit/policy";

const app = new Hono();

const store = new MemoryStore();
const limiter = new RateLimiter(store);

app.get("/", (c) => {
  return c.json({
    name: "rate-limiter",
    status: "ok",
  });
});

app.get("/api/test", async (c) => {
  const identifier = c.req.header("x-client-id") ?? "anonymous";

  const result = await limiter.check(
    identifier,
    defaultPolicy,
  );

  if (!result.allowed) {
    return c.json(
      {
        error: "rate_limit_exceeded",
        message: "Too many requests",
        retryAfter: result.retryAfter,
      },
      429,
    );
  }

  return c.json({
    message: "Request allowed",
    rateLimit: result,
  });
});

export default app;