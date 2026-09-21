import { describe, expect, test } from "bun:test";

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
  test("allows requests within the limit", async () => {
    const response = await app.request("/api/test", {
      headers: {
        "x-client-id": "user-1",
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as SuccessResponse;

    expect(body).toEqual({
      message: "Request allowed",
    });

    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  test("rejects requests after the limit", async () => {
    const clientId = `user-${crypto.randomUUID()}`;

    for (let i = 0; i < 5; i++) {
      const response = await app.request("/api/test", {
        headers: {
          "x-client-id": clientId,
        },
      });

      expect(response.status).toBe(200);
    }

    const response = await app.request("/api/test", {
      headers: {
        "x-client-id": clientId,
      },
    });

    expect(response.status).toBe(429);

    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("Retry-After")).toBeTruthy();

    const body = (await response.json()) as ErrorResponse;

    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.message).toBe("Too many requests");
    expect(body.retryAfter).toBeDefined();
  });

  test("tracks different clients independently", async () => {
    const user1 = `user-${crypto.randomUUID()}`;
    const user2 = `user-${crypto.randomUUID()}`;

    for (let i = 0; i < 5; i++) {
      await app.request("/api/test", {
        headers: {
          "x-client-id": user1,
        },
      });
    }

    const blockedUser1 = await app.request("/api/test", {
      headers: {
        "x-client-id": user1,
      },
    });

    const user2Response = await app.request("/api/test", {
      headers: {
        "x-client-id": user2,
      },
    });

    expect(blockedUser1.status).toBe(429);

    expect(user2Response.status).toBe(200);
    expect(user2Response.headers.get("X-RateLimit-Remaining")).toBe("4");
  });

  test("uses anonymous as the default client key", async () => {
    const response = await app.request("/api/test");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
  });

  test("does not rate limit unrelated routes", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBeNull();
  });
});