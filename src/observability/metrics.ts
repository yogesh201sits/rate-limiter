import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
});

export const rateLimitRequestsTotal =
  new Counter({
    name: "rate_limit_requests_total",
    help: "Total number of rate-limited requests",
    labelNames: ["algorithm", "policy"],
    registers: [metricsRegistry],
  });

export const rateLimitAllowedTotal =
  new Counter({
    name: "rate_limit_allowed_total",
    help: "Total number of allowed rate-limited requests",
    labelNames: ["algorithm", "policy"],
    registers: [metricsRegistry],
  });

export const rateLimitRejectedTotal =
  new Counter({
    name: "rate_limit_rejected_total",
    help: "Total number of rejected rate-limited requests",
    labelNames: ["algorithm", "policy"],
    registers: [metricsRegistry],
  });

export const rateLimitErrorsTotal =
  new Counter({
    name: "rate_limit_errors_total",
    help: "Total number of rate limiter errors",
    labelNames: ["algorithm", "policy"],
    registers: [metricsRegistry],
  });

export const rateLimitCheckDuration =
  new Histogram({
    name: "rate_limit_check_duration_seconds",
    help: "Rate limiter check duration in seconds",
    labelNames: ["algorithm", "policy"],
    registers: [metricsRegistry],
    buckets: [
      0.001,
      0.005,
      0.01,
      0.025,
      0.05,
      0.1,
      0.25,
      0.5,
      1,
    ],
  });