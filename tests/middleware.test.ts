import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import { RateLimiter } from "../src/rate-limit/limiter";
import { rateLimit } from "../src/rate-limit/middleware";

import app from "../src/app";

type ErrorResponse = {
  error: string;
  message: string;
  retryAfter?: number;
};

type SuccessResponse = {
  message: string;
};

describe("Rate limit middleware", () => {
  test("applies the api policy", async () => {
    const clientId = `api-${crypto.randomUUID()}`;

    const response = await app.request("/api/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    expect(response.status).toBe(200);

    expect(
      response.headers.get("X-RateLimit-Limit"),
    ).toBe("100");

    expect(
      response.headers.get("X-RateLimit-Remaining"),
    ).toBe("99");

    const body = (await response.json()) as SuccessResponse;

    expect(body).toEqual({
      message: "API request allowed",
    });
  });

  test("applies the auth policy", async () => {
    const clientId = `auth-${crypto.randomUUID()}`;

    const response = await app.request("/auth/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    expect(response.status).toBe(200);

    expect(
      response.headers.get("X-RateLimit-Limit"),
    ).toBe("5");

    expect(
      response.headers.get("X-RateLimit-Remaining"),
    ).toBe("4");

    const body = (await response.json()) as SuccessResponse;

    expect(body).toEqual({
      message: "Auth request allowed",
    });
  });

  test("applies the search policy", async () => {
    const clientId = `search-${crypto.randomUUID()}`;

    const response = await app.request("/search/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    expect(response.status).toBe(200);

    expect(
      response.headers.get("X-RateLimit-Limit"),
    ).toBe("30");

    expect(
      response.headers.get("X-RateLimit-Remaining"),
    ).toBe("29");

    const body = (await response.json()) as SuccessResponse;

    expect(body).toEqual({
      message: "Search request allowed",
    });
  });

  test("keeps policies independent for the same client", async () => {
    const clientId = `shared-${crypto.randomUUID()}`;

    const apiResponse = await app.request("/api/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    const authResponse = await app.request("/auth/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    const searchResponse = await app.request("/search/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    expect(
      apiResponse.headers.get("X-RateLimit-Remaining"),
    ).toBe("99");

    expect(
      authResponse.headers.get("X-RateLimit-Remaining"),
    ).toBe("4");

    expect(
      searchResponse.headers.get("X-RateLimit-Remaining"),
    ).toBe("29");
  });

  test(
    "rejects auth requests after the limit",
    async () => {
      const clientId = `auth-limit-${crypto.randomUUID()}`;

      for (let i = 0; i < 5; i++) {
        const response = await app.request("/auth/test", {
          headers: {
            "x-client-id": clientId,
          },
        });

        expect(response.status).toBe(200);
      }

      const response = await app.request("/auth/test", {
        headers: {
          "x-client-id": clientId,
        },
      });

      expect(response.status).toBe(429);

      expect(
        response.headers.get("X-RateLimit-Limit"),
      ).toBe("5");

      expect(
        response.headers.get("X-RateLimit-Remaining"),
      ).toBe("0");

      expect(
        response.headers.get("Retry-After"),
      ).toBeTruthy();

      const body = (await response.json()) as ErrorResponse;

      expect(body.error).toBe("rate_limit_exceeded");
      expect(body.message).toBe("Too many requests");
      expect(body.retryAfter).toBeDefined();
    },
    15000,
  );

  test("uses anonymous as the default client key", async () => {
    const response = await app.request("/auth/test");

    expect(response.status).toBe(200);

    expect(
      response.headers.get("X-RateLimit-Limit"),
    ).toBe("5");
  });

  test("does not rate limit unrelated routes", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(200);

    expect(
      response.headers.get("X-RateLimit-Limit"),
    ).toBeNull();
  });

  test("allows the request when failure mode is open", async () => {
    const app = new Hono();

    const failingLimiter = {
      check: async () => {
        throw new Error("Redis unavailable");
      },
    } as unknown as RateLimiter;

    app.use(
      "/test/*",
      rateLimit({
        limiter: failingLimiter,
        policy: {
          name: "test",
          limit: 5,
          windowSeconds: 60,
        },
        failureMode: "open",
      }),
    );

    app.get("/test/open", (c) => {
      return c.json({
        message: "Request allowed",
      });
    });

    const response = await app.request("/test/open");

    expect(response.status).toBe(200);

    const body = (await response.json()) as SuccessResponse;

    expect(body).toEqual({
      message: "Request allowed",
    });
  });

  test("rejects the request when failure mode is closed", async () => {
    const app = new Hono();

    const failingLimiter = {
      check: async () => {
        throw new Error("Redis unavailable");
      },
    } as unknown as RateLimiter;

    app.use(
      "/test/*",
      rateLimit({
        limiter: failingLimiter,
        policy: {
          name: "test",
          limit: 5,
          windowSeconds: 60,
        },
        failureMode: "closed",
      }),
    );

    app.get("/test/closed", (c) => {
      return c.json({
        message: "Request allowed",
      });
    });

    const response = await app.request("/test/closed");

    expect(response.status).toBe(503);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error).toBe("rate_limit_unavailable");
    expect(body.message).toBe("Rate limiter unavailable");
  });
});