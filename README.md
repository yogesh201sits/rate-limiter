# Rate Limiter

A production-oriented distributed rate limiter built with **Bun, Hono, TypeScript, and Redis**.

The project implements three rate-limiting algorithms behind a common engine interface:

- Fixed Window
- Token Bucket
- Leaky Bucket

Redis-backed implementations use atomic Lua scripts for concurrent request handling.

---

## Features

- Multiple rate-limiting algorithms
- Redis-backed distributed state
- Atomic Redis operations using Lua
- In-memory Leaky Bucket implementation
- Algorithm-agnostic middleware
- Centralized rate-limit policies
- Configurable failure modes
- Standard rate-limit response headers
- Prometheus metrics
- HTTP benchmark suite
- TypeScript type safety
- Bun runtime and test runner

---

## Architecture

```text
                         Hono
                           │
                           ▼
                    Rate Limit Middleware
                           │
                           ▼
                    RateLimitEngine
                    ┌──────┼──────┐
                    │      │      │
                    ▼      ▼      ▼
               Fixed    Token    Leaky
               Window   Bucket   Bucket
                    │      │      │
                    ▼      ▼      ▼
                 Redis   Redis   Redis
                 Store   Store   Store
````

The middleware is independent of the underlying algorithm.

Policies determine which algorithm and configuration are used.

---

## Algorithms

### Fixed Window

Counts requests inside fixed time windows.

```text
Window 1              Window 2
|--------------------|--------------------|
     requests              requests
```

Example:

```ts
{
  name: "api",
  algorithm: "fixed-window",
  config: {
    limit: 100,
    windowSeconds: 60,
  },
}
```

Suitable for simple request quotas and predictable limits.

---

### Token Bucket

Maintains a bucket of tokens that refill over time.

```text
        refill
          ↓
     ┌───────────┐
     │   TOKENS  │
     │ ● ● ● ● ● │
     └─────┬─────┘
           │
           ▼
        request
```

Example:

```ts
{
  name: "burst",
  algorithm: "token-bucket",
  config: {
    capacity: 10,
    refillRate: 1,
  },
}
```

Token Bucket allows controlled bursts while maintaining a long-term request rate.

---

### Leaky Bucket

This implementation uses virtual scheduling to model a queue with a fixed leak rate.

```text
Requests
   │
   ▼
┌─────────────┐
│   Bucket    │
│ ● ● ● ● ●   │
└──────┬──────┘
       │
       ▼
   fixed rate
```

Requests are admitted when a virtual service slot is available.

The middleware does not delay execution; this is an admission-control implementation rather than a downstream request queue.

Example:

```ts
{
  name: "leaky",
  algorithm: "leaky-bucket",
  config: {
    capacity: 10,
    leakRate: 2,
  },
}
```

---

## Tech Stack

* **Runtime:** Bun
* **Language:** TypeScript
* **HTTP Framework:** Hono
* **Database / State:** Redis
* **Redis Client:** ioredis
* **Metrics:** prom-client
* **Testing:** Bun Test
* **Linting / Formatting:** Biome

---

## Project Structure

```text
rate-limiter/
├── src/
│   ├── benchmark/
│   │   └── rate-limit.bench.ts
│   │
│   ├── observability/
│   │   └── metrics.ts
│   │
│   ├── rate-limit/
│   │   ├── limiter.ts
│   │   ├── limiter-interface.ts
│   │   ├── middleware.ts
│   │   │
│   │   ├── token-bucket.ts
│   │   ├── token-bucket-limiter.ts
│   │   ├── redis-token-bucket-store.ts
│   │   │
│   │   ├── leaky-bucket.ts
│   │   ├── leaky-bucket-limiter.ts
│   │   ├── memory-leaky-bucket-store.ts
│   │   ├── redis-leaky-bucket-store.ts
│   │   │
│   │   └── types.ts
│   │
│   ├── redis.ts
│   └── app.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd rate-limiter
```

Install dependencies:

```bash
bun install
```

---

## Environment Variables

Create a `.env` file:

```env
REDIS_URL=your_redis_connection_string
```

Do not commit `.env` or Redis credentials to source control.

---

## Running the Project

Start the development server:

```bash
bun run dev
```

The API will run on:

```text
http://localhost:3000
```

---

## API Examples

The project exposes example routes using different rate-limiting policies.

### Fixed Window

```text
GET /api/test
```

### Token Bucket

```text
GET /burst/test
```

### Leaky Bucket

```text
GET /leaky/test
```

You can identify clients using:

```http
x-client-id: my-client
```

Example:

```bash
curl http://localhost:3000/api/test \
  -H "x-client-id: user-123"
```

---

## Rate Limit Headers

Successful and rejected requests expose rate-limit information through response headers.

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1727000000
```

When a request is rejected:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 10
```

Example response:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retryAfter": 10
}
```

---

## Failure Modes

The middleware supports two storage failure modes.

### Closed

Requests are rejected when the rate limiter cannot access its storage.

```ts
failureMode: "closed"
```

Response:

```http
503 Service Unavailable
```

### Open

Requests are allowed when the rate limiter storage is unavailable.

```ts
failureMode: "open"
```

This allows applications to choose how they want to behave during rate-limiter infrastructure failures.

---

## Prometheus Metrics

Metrics are exposed at:

```text
GET /metrics
```

The project exposes:

```text
rate_limit_requests_total
rate_limit_allowed_total
rate_limit_rejected_total
rate_limit_errors_total
rate_limit_check_duration_seconds
```

Metrics include:

```text
algorithm
policy
```

labels.

Example:

```text
rate_limit_requests_total{
  algorithm="leaky-bucket",
  policy="leaky"
} 36
```

The metrics endpoint can be scraped by any Prometheus-compatible monitoring system.

---

## Benchmarking

The project includes an HTTP benchmark covering all three algorithms.

Run:

```bash
bun run src/benchmark/rate-limit.bench.ts
```

The benchmark measures:

* Total requests
* Concurrency
* Throughput
* Allowed requests
* Rejected requests
* Errors
* Average latency
* P95 latency

### Benchmark configuration

```text
Requests:    1000
Concurrency: 50
```

### Recorded results

| Algorithm    |   Throughput | Avg Latency | P95 Latency | Allowed | Rejected | Errors |
| ------------ | -----------: | ----------: | ----------: | ------: | -------: | -----: |
| Fixed Window | 117.92 req/s |   415.59 ms |   665.90 ms |     100 |      900 |      0 |
| Token Bucket |  22.65 req/s |  2191.20 ms |  8372.31 ms |      94 |      906 |      0 |
| Leaky Bucket |  67.54 req/s |   735.71 ms |  1217.11 ms |      39 |      961 |      0 |

These measurements represent the configured policies and the full HTTP → Hono → rate limiter → Redis path.

They should not be interpreted as universal performance rankings between algorithms because each algorithm uses different admission and refill/leak configurations.

---

## Concurrency

Redis-backed algorithms use atomic operations to maintain consistent state when multiple requests access the same rate-limit key concurrently.

For example:

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┼──► Redis Lua Script ──► Atomic state update
Request 4 ─┤
Request 5 ─┘
```

This is important for distributed applications where multiple application instances may share the same Redis state.

---

## Testing

Run the test suite with:

```bash
bun test
```

Run TypeScript checking:

```bash
bunx tsc --noEmit
```

---

## Design

The core design separates:

```text
Policy
   ↓
Engine
   ↓
Algorithm
   ↓
Store
```

This makes it possible to add another rate-limiting algorithm without rewriting the middleware.

For example:

```ts
export interface RateLimitEngine {
  check(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult>;
}
```

The middleware only depends on this interface.

---

## Why Redis?

In-memory rate limiting works for a single process, but distributed applications require shared state.

Redis provides:

* Shared state across application instances
* Atomic operations
* Fast reads/writes
* Lua scripting
* TTL support

The Redis implementations therefore allow multiple application instances to participate in the same rate-limiting system.

---

## Future Improvements

Potential future work includes:

* More detailed benchmark scenarios
* Additional storage implementations
* Configurable benchmark policies
* Dashboard integrations
* Additional rate-limiting algorithms
* More extensive failure-injection testing

---

## License

MIT

```

This is ready to use as the project's README. I kept the benchmark numbers exactly from your completed run and explicitly qualified what they do—and don't—demonstrate.
```
