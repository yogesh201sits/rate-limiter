import type { RateLimitPolicy } from "./types";

export const defaultPolicy: RateLimitPolicy = {
  name: "default",
  limit: 10,
  windowSeconds: 60,
};