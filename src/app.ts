import { Hono } from "hono";

import { createRateLimitEngine } from "./rate-limit/factory";
import { rateLimit } from "./rate-limit/middleware";
import { resolvePolicy } from "./rate-limit/policy-resolver";
import { RedisStore } from "./rate-limit/redis-store";
import { RedisTokenBucketStore } from "./rate-limit/redis-token-bucket-store";

const app = new Hono();

/* -------------------------------------------------------------------------- */
/* Stores                                                                     */
/* -------------------------------------------------------------------------- */

const fixedWindowStore = new RedisStore();

const tokenBucketStore = new RedisTokenBucketStore();

const dependencies = {
  fixedWindowStore,
  tokenBucketStore,
};

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

app.get("/", (c) => {
  return c.json({
    name: "rate-limiter",
    status: "ok",
  });
});

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

const apiPolicy = resolvePolicy("api");

app.use(
  "/api/*",
  rateLimit({
    limiter: createRateLimitEngine(
      apiPolicy,
      dependencies,
    ),
    policy: apiPolicy,
    failureMode: "closed",
  }),
);

app.get("/api/test", (c) => {
  return c.json({
    message: "API request allowed",
  });
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

const authPolicy = resolvePolicy("auth");

app.use(
  "/auth/*",
  rateLimit({
    limiter: createRateLimitEngine(
      authPolicy,
      dependencies,
    ),
    policy: authPolicy,
    failureMode: "closed",
  }),
);

app.get("/auth/test", (c) => {
  return c.json({
    message: "Auth request allowed",
  });
});

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

const searchPolicy = resolvePolicy("search");

app.use(
  "/search/*",
  rateLimit({
    limiter: createRateLimitEngine(
      searchPolicy,
      dependencies,
    ),
    policy: searchPolicy,
    failureMode: "closed",
  }),
);

app.get("/search/test", (c) => {
  return c.json({
    message: "Search request allowed",
  });
});

/* -------------------------------------------------------------------------- */
/* Burst                                                                     */
/* -------------------------------------------------------------------------- */

const burstPolicy = resolvePolicy("burst");

app.use(
  "/burst/*",
  rateLimit({
    limiter: createRateLimitEngine(
      burstPolicy,
      dependencies,
    ),
    policy: burstPolicy,
    failureMode: "closed",
  }),
);

app.get("/burst/test", (c) => {
  return c.json({
    message: "Burst request allowed",
  });
});

export default app;