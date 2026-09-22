type BenchmarkResult = {
  name: string;
  totalRequests: number;
  concurrency: number;
  durationMs: number;
  requestsPerSecond: number;
  allowed: number;
  rejected: number;
  errors: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
};

type BenchmarkTarget = {
  name: string;
  url: string;
};

const BASE_URL = "http://localhost:3000";

const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 50;

const targets: BenchmarkTarget[] = [
  {
    name: "fixed-window",
    url: `${BASE_URL}/api/test`,
  },
  {
    name: "token-bucket",
    url: `${BASE_URL}/burst/test`,
  },
  {
    name: "leaky-bucket",
    url: `${BASE_URL}/leaky/test`,
  },
];

const percentile = (
  values: number[],
  percentileValue: number,
): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index = Math.min(
    Math.ceil(
      percentileValue * sorted.length,
    ) - 1,
    sorted.length - 1,
  );

  return sorted[Math.max(index, 0)] ?? 0;
};

const runBenchmark = async (
  target: BenchmarkTarget,
): Promise<BenchmarkResult> => {
  const latencies: number[] = [];

  let allowed = 0;
  let rejected = 0;
  let errors = 0;
  let completed = 0;

  const benchmarkKey =
    `benchmark-${target.name}-${Date.now()}`;

  const start = performance.now();

  const worker = async () => {
    while (true) {
      const requestNumber = completed++;

      if (requestNumber >= TOTAL_REQUESTS) {
        return;
      }

      const requestStart = performance.now();

      try {
        const response = await fetch(
          target.url,
          {
            headers: {
              "x-client-id": benchmarkKey,
            },
          },
        );

        const latency =
          performance.now() -
          requestStart;

        latencies.push(latency);

        if (response.status === 200) {
          allowed++;
        } else if (response.status === 429) {
          rejected++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: CONCURRENCY },
      () => worker(),
    ),
  );

  const durationMs =
    performance.now() - start;

  return {
    name: target.name,
    totalRequests: TOTAL_REQUESTS,
    concurrency: CONCURRENCY,
    durationMs,
    requestsPerSecond:
      TOTAL_REQUESTS /
      (durationMs / 1000),
    allowed,
    rejected,
    errors,
    averageLatencyMs:
      latencies.length === 0
        ? 0
        : latencies.reduce(
            (sum, value) =>
              sum + value,
            0,
          ) / latencies.length,
    p95LatencyMs: percentile(
      latencies,
      0.95,
    ),
  };
};

const printResult = (
  result: BenchmarkResult,
) => {
  console.log("");
  console.log(
    `=== ${result.name} ===`,
  );

  console.log(
    `Requests:       ${result.totalRequests}`,
  );

  console.log(
    `Concurrency:    ${result.concurrency}`,
  );

  console.log(
    `Duration:       ${result.durationMs.toFixed(2)} ms`,
  );

  console.log(
    `Throughput:     ${result.requestsPerSecond.toFixed(2)} req/s`,
  );

  console.log(
    `Allowed:        ${result.allowed}`,
  );

  console.log(
    `Rejected:       ${result.rejected}`,
  );

  console.log(
    `Errors:         ${result.errors}`,
  );

  console.log(
    `Avg latency:    ${result.averageLatencyMs.toFixed(2)} ms`,
  );

  console.log(
    `P95 latency:    ${result.p95LatencyMs.toFixed(2)} ms`,
  );
};

console.log(
  `Benchmarking ${TOTAL_REQUESTS} requests with ${CONCURRENCY} concurrent workers...`,
);

const results: BenchmarkResult[] = [];

for (const target of targets) {
  const result =
    await runBenchmark(target);

  results.push(result);

  printResult(result);
}

console.log("");
console.log("=== Summary ===");

console.table(
  results.map((result) => ({
    algorithm: result.name,
    requests: result.totalRequests,
    throughput: `${result.requestsPerSecond.toFixed(2)} req/s`,
    allowed: result.allowed,
    rejected: result.rejected,
    errors: result.errors,
    avgLatency: `${result.averageLatencyMs.toFixed(2)} ms`,
    p95Latency: `${result.p95LatencyMs.toFixed(2)} ms`,
  })),
);