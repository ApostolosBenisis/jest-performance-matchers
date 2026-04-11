# jest-performance-matchers

[![npm version](https://img.shields.io/npm/v/jest-performance-matchers)](https://www.npmjs.com/package/jest-performance-matchers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/ApostolosBenisis/jest-performance-matchers/actions/workflows/node.js.yml/badge.svg)](https://github.com/ApostolosBenisis/jest-performance-matchers/actions/workflows/node.js.yml)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)

```
   ▂▅▇█▇▅▄▃▂▂▁▁▁
   jest-performance-matchers
   Assert · Measure · Prove
```

Jest matchers for **statistically reliable** performance testing in Node.js. Measure code execution time over multiple iterations, assert on quantiles, **compare two functions via Welch's t-test**, and catch performance regressions in CI — all with zero dependencies.

```ts
// Ensure your API handler stays fast — P95 under 50ms across 100 runs
await expect(async () => {
    await handleRequest(mockReq);
}).toResolveWithinQuantile(50, { iterations: 100, quantile: 95, warmup: 5 });

// Prove your optimized sort is statistically faster than the baseline
expect(() => quicksort(data))
    .toBeFasterThan(() => bubblesort(data), { iterations: 100, warmup: 5 });
```

## What is this for?

Use `jest-performance-matchers` when you need to:

- **Set performance budgets in CI** — fail the build when critical paths exceed time limits
- **Detect performance regressions** — catch slowdowns before they reach production
- **Validate with statistical confidence** — assert on percentiles (P90, P95, P99), not single flaky runs
- **Compare implementations** — prove one algorithm is statistically faster than another using Welch's t-test

If you already have Jest tests, adding performance assertions takes one import and one line of code.

## Why not just `Date.now()`?

| | `Date.now()` / manual timing | `jest-performance-matchers` |
|---|---|---|
| **Accuracy** | ~1ms resolution | Sub-millisecond (`process.hrtime()`) |
| **Flakiness** | Single run = noisy result | Multiple iterations + quantiles = stable |
| **Outliers** | One GC pause fails the test | IQR-based outlier removal |
| **Diagnostics** | You get a number | Mean, median, CI, percentiles, shape, sparklines, and actionable guidance |
| **Comparison** | Run both, compare means, hope for the best | Welch's t-test with p-values, confidence intervals, and effect size |
| **Warmup** | DIY or forget about it | Built-in warmup iterations |
| **Statistics** | None built-in | Built-in — mean, CI, quantiles, outlier detection |
| **Dependencies** | Grows with each need — more code to trust | Zero — nothing to audit, nothing to break |

## Why jest-performance-matchers?

- **Zero dependencies** — lightweight and safe to add; all statistics implemented in-house
- **Full TypeScript support** — type declarations included, works seamlessly with `ts-jest`
- **High-resolution timing** — `process.hrtime()` for sub-millisecond accuracy
- **Statistical rigor** — 95% confidence intervals (Student's t / z), IQR outlier detection, skewness analysis, distribution shape classification, quality tags, sample adequacy labels, and interpretive guidance on failure
- **Warmup iterations** — exclude JIT compilation and cache warming from measurements
- **Comparative benchmarking** — Welch's t-test to statistically prove one function is faster than another, with one-sided hypothesis testing and configurable confidence levels
- **Exported utilities** — use `calcStats()`, `calcQuantile()`, `removeOutliers()`, and `welchTTest()` directly in your own code

## Prerequisites

- Jest 27.0.0 or newer (including Jest 29)
- Node.js 18.0.0 or newer

## Installation

```
npm install --save-dev jest-performance-matchers
```

## Setup

Import the matchers in each test file:

```ts
import 'jest-performance-matchers';
```

Or register them globally via `setupFilesAfterEnv` as described in [Configuring Jest](https://jestjs.io/docs/configuration#setupfilesafterenv-array):

```ts
// setupPerformanceMatchers.ts
import 'jest-performance-matchers';
```

```js
// jest.config.js
"jest": {
  "setupFilesAfterEnv": ['<rootDir>/setupPerformanceMatchers.ts']
}
```

> **TypeScript:** If you are using `ts-jest`, importing `jest-performance-matchers` will
> automatically register the custom matchers and their type declarations — no extra
> setup is needed.

## Real-world examples

### UI render budget (60fps = 16ms per frame)

```ts
expect(() => {
    renderComponent(props);
}).toCompleteWithinQuantile(16, { iterations: 50, quantile: 95, warmup: 3 });
```

### API latency budget

```ts
await expect(async () => {
    await handleRequest(mockReq);
}).toResolveWithinQuantile(100, { iterations: 100, quantile: 90, warmup: 5, outliers: 'remove' });
```

### Data processing throughput

```ts
expect(() => {
    transformDataset(records);
}).toCompleteWithinQuantile(200, { iterations: 30, quantile: 95 });
```

### Algorithm comparison

```ts
expect(() => optimizedParser(input))
    .toBeFasterThan(() => legacyParser(input), {
        iterations: 100, warmup: 5, confidence: 0.95
    });
```

### Database query optimization

```ts
await expect(async () => await queryWithIndex(db, id))
    .toResolveFasterThan(async () => await queryFullScan(db, id), {
        iterations: 50, warmup: 3, outliers: 'remove'
    });
```

> **Want runnable examples?** See the [`examples/`](./examples) directory for complete, working test files covering all matchers and exported utilities.

## Matchers

### `.toCompleteWithin(ms, options?)`

Assert that synchronous code runs within the given duration:

```ts
expect(() => {
    sortArray(data);
}).toCompleteWithin(10);

// Negation — assert it takes longer than the threshold
expect(() => {
    heavyComputation();
}).not.toCompleteWithin(10);

// With setup/teardown — setup return value is passed to the callback, not timed
expect((data: number[]) => {
    sortArray(data);
}).toCompleteWithin(10, {
    setup: () => generateRandomArray(1000),
});
```

### `.toCompleteWithinQuantile(ms, options)`

Assert that synchronous code, executed over multiple iterations, runs within the given duration at the specified quantile:

```ts
// Basic — 95% of 100 runs should complete within 10ms
expect(() => {
    sortArray(data);
}).toCompleteWithinQuantile(10, { iterations: 100, quantile: 95 });

// With warmup — exclude JIT compilation overhead
expect(() => {
    sortArray(data);
}).toCompleteWithinQuantile(10, { iterations: 100, quantile: 95, warmup: 5 });

// With outlier removal — filter statistical outliers via IQR method
expect(() => {
    sortArray(data);
}).toCompleteWithinQuantile(10, { iterations: 100, quantile: 95, outliers: 'remove' });

// Combined
expect(() => {
    sortArray(data);
}).toCompleteWithinQuantile(10, { iterations: 100, quantile: 95, warmup: 5, outliers: 'remove' });

// With error tolerance — tolerate up to 5% of iterations throwing
expect(() => {
    processUnstableInput(data);
}).toCompleteWithinQuantile(10, { iterations: 200, quantile: 95, allowedErrorRate: 0.05 });
```

### `.toResolveWithin(ms, options?)`

Assert that asynchronous code resolves within the given duration. Supports optional `setup`/`teardown` callbacks (`setup` return value is passed to the callback and teardown; may return a Promise):

```ts
await expect(async () => {
    await fetchData();
}).toResolveWithin(100);

// Also works with promise-returning functions
return expect(() => {
    return fetchData();
}).toResolveWithin(100);

// Negation
await expect(async () => {
    await slowOperation();
}).not.toResolveWithin(10);
```

### `.toResolveWithinQuantile(ms, options)`

Assert that asynchronous code, executed over multiple iterations, resolves within the given duration at the specified quantile:

```ts
// Basic
await expect(async () => {
    await fetchData();
}).toResolveWithinQuantile(100, { iterations: 50, quantile: 90 });

// With warmup — exclude cold-start overhead (connection pools, caches)
await expect(async () => {
    await fetchData();
}).toResolveWithinQuantile(100, { iterations: 50, quantile: 90, warmup: 3 });

// With outlier removal
await expect(async () => {
    await fetchData();
}).toResolveWithinQuantile(100, { iterations: 50, quantile: 90, outliers: 'remove' });

// With error tolerance — tolerate up to 2% of iterations failing (e.g., transient network errors)
await expect(async () => {
    await handleRequest(mockReq);
}).toResolveWithinQuantile(100, { iterations: 200, quantile: 95, allowedErrorRate: 0.02 });
```

### `.toBeFasterThan(comparisonFn, options)`

Assert that a synchronous function is statistically faster than another using Welch's t-test. Both functions are executed for N iterations (interleaved), and the results are compared for statistical significance:

```ts
// Basic — prove quicksort is faster than bubblesort across 100 runs
expect(() => quicksort(data))
    .toBeFasterThan(() => bubblesort(data), { iterations: 100 });

// With warmup — exclude JIT compilation overhead
expect(() => quicksort(data))
    .toBeFasterThan(() => bubblesort(data), { iterations: 100, warmup: 5 });

// With outlier removal — filter GC pauses before comparing
expect(() => quicksort(data))
    .toBeFasterThan(() => bubblesort(data), { iterations: 100, outliers: 'remove' });

// With custom confidence — require 99% confidence instead of 95%
expect(() => quicksort(data))
    .toBeFasterThan(() => bubblesort(data), { iterations: 100, confidence: 0.99 });

// Negation — assert Function A is NOT faster than Function B
expect(() => legacyParser(input))
    .not.toBeFasterThan(() => optimizedParser(input), { iterations: 100 });

// With error tolerance — tolerate up to 5% of iterations failing
expect(() => processUnstable(data))
    .toBeFasterThan(() => processStable(data), { iterations: 200, allowedErrorRate: 0.05 });
```

### `.toResolveFasterThan(comparisonFn, options)`

Assert that an asynchronous function is statistically faster than another using Welch's t-test. Same API as `.toBeFasterThan`, but for promise-returning functions:

```ts
// Basic
await expect(async () => await queryWithIndex(db, id))
    .toResolveFasterThan(async () => await queryFullScan(db, id), { iterations: 50 });

// With warmup and outlier removal
await expect(async () => await cachedFetch(url))
    .toResolveFasterThan(async () => await uncachedFetch(url), {
        iterations: 50, warmup: 3, outliers: 'remove'
    });

// Negation
await expect(async () => await slowQuery(db))
    .not.toResolveFasterThan(async () => await fastQuery(db), { iterations: 50 });
```

### Comparative options reference

| Option | Type | Required | Description |
|---|---|---|---|
| `iterations` | `number` | Yes | Number of measured iterations per function (integer >= 2) |
| `warmup` | `number` | No | Warmup iterations to run before measurement (default: `0`) |
| `confidence` | `number` | No | Significance level for the t-test, between 0 and 1 exclusive (default: `0.95`). Higher values require stronger evidence |
| `outliers` | `'remove' \| 'keep'` | No | Whether to remove IQR-based outliers per function before comparison (default: `'keep'`) |
| `setup` | `() => T` | No | Called **once** before all iterations. Return value is shared by both functions via `setupEach`, callbacks, and `teardown`. Errors are fatal |
| `teardown` | `(suiteState: T) => void` | No | Called **once** after all iterations (in a `finally` block). Receives the `setup` return value. Errors are fatal |
| `setupEach` | `(suiteState: T) => U` | No | Called before **each function in each iteration** (including warmup), not timed. Called separately for A and B so each gets fresh state. Its return value is passed to the callback and `teardownEach`. Errors are fatal |
| `teardownEach` | `(suiteState: T, iterState: U) => void` | No | Called after **each function in each iteration** (including warmup), not timed. Receives both `setup` and `setupEach` return values. Errors are fatal |
| `allowedErrorRate` | `number` | No | Fraction of iterations allowed to throw per function (0–1, default: `0`). Error rates are checked independently for each function. Setup/teardown errors are always fatal |

> **Execution model:** Iterations are interleaved — each iteration runs A then B. `setupEach` is called separately for each function so mutations in one function's state don't affect the other. Minimum 2 iterations required (Welch's t-test needs n >= 2 per function).

> **Note:** For async matchers (`toResolveFasterThan`), `setup` and `setupEach` may return a `Promise`, and `teardown`/`teardownEach` may return a `Promise`.

#### Comparative setup/teardown example

```ts
// setup runs once (shared), setupEach runs per function per iteration (fresh state each time)
expect((conn: DbConnection, data: Row[]) => {
    processWithNewAlgorithm(conn, data);
}).toBeFasterThan((conn: DbConnection, data: Row[]) => {
    processWithOldAlgorithm(conn, data);
}, {
    iterations: 50,
    warmup: 5,
    setup: (): DbConnection => createDbConnection(),
    setupEach: (conn: DbConnection): Row[] => conn.query('SELECT * FROM test_data'),
    teardownEach: (conn: DbConnection, data: Row[]) => { /* per-iteration cleanup */ },
    teardown: (conn: DbConnection) => conn.close(),
});
```

Setup, teardown, setupEach, and teardownEach time is excluded from measurements. If any throws, the test fails immediately — these are test infrastructure errors, not tolerated failures.

### Quantile options reference

| Option | Type | Required | Description |
|---|---|---|---|
| `iterations` | `number` | Yes | Number of measured iterations (positive integer) |
| `quantile` | `number` | Yes | Percentile threshold, 1-100 (e.g., `95` means P95) |
| `warmup` | `number` | No | Warmup iterations to run before measurement (default: `0`) |
| `outliers` | `'remove' \| 'keep'` | No | Whether to remove IQR-based outliers before computing the quantile (default: `'keep'`) |
| `setup` | `() => T` | No | Called **once** before all iterations. Its return value is passed to `setupEach`, the callback, `teardownEach`, and `teardown`. Errors are fatal |
| `teardown` | `(suiteState: T) => void` | No | Called **once** after all iterations. Receives the `setup` return value. Errors are fatal |
| `setupEach` | `(suiteState: T) => U` | No | Called before **each** iteration (including warmup), not timed. Receives the `setup` return value; its own return value is passed to the callback and `teardownEach`. Errors are fatal |
| `teardownEach` | `(suiteState: T, iterState: U) => void` | No | Called after **each** iteration (including warmup), not timed. Receives both `setup` and `setupEach` return values. Errors are fatal |
| `allowedErrorRate` | `number` | No | Fraction of iterations allowed to throw (0–1, default: `0`). Failed iterations are excluded from timing stats. If the actual error rate exceeds this threshold, the matcher fails. Setup/teardown errors are always fatal |

> **Note:** For async matchers (`toResolveWithinQuantile`), `setup` and `setupEach` may return a `Promise` (the resolved value is forwarded), and `teardown`/`teardownEach` may return a `Promise`.

#### Setup/teardown example

```ts
// setup runs once, setupEach runs per iteration — callback receives both
expect((conn: DbConnection, data: Row[]) => {
    processRows(conn, data);
}).toCompleteWithinQuantile(10, {
    iterations: 100,
    quantile: 95,
    setup: (): DbConnection => createDbConnection(),
    setupEach: (conn: DbConnection): Row[] => conn.query('SELECT * FROM test_data'),
    teardownEach: (conn: DbConnection, data: Row[]) => { /* per-iteration cleanup */ },
    teardown: (conn: DbConnection) => conn.close(),
});
```

#### Async setup/teardown example

```ts
// Async hooks — setup opens a pool once, setupEach fetches fresh data per iteration
await expect(async (pool: Pool, rows: Row[]) => {
    await processRows(pool, rows);
}).toResolveWithinQuantile(50, {
    iterations: 100,
    quantile: 95,
    warmup: 5,
    setup: async (): Promise<Pool> => await createConnectionPool(),
    setupEach: async (pool: Pool): Promise<Row[]> => await pool.query('SELECT * FROM test_data'),
    teardownEach: async (pool: Pool, rows: Row[]) => { await pool.query('DELETE FROM temp'); },
    teardown: async (pool: Pool) => { await pool.close(); },
});
```

Setup, teardown, setupEach, and teardownEach time is excluded from measurements. If any throws, the test fails immediately — these are test infrastructure errors, not tolerated failures.

## Failure diagnostics

### Quantile matcher diagnostics

When a quantile matcher fails, it outputs rich diagnostics to help you understand your performance profile:

```
expected that 95% of the time when running 50 iterations,
the function duration to be less or equal to 10 (ms),
instead it was 21.43 (ms)

Statistics (n=50): mean=8.81ms, median=5.70ms, stddev=7.33ms
Confidence Interval (CI): 95% [6.78, 10.85]ms
Relative Margin of Error (RME): 23.05% [FAIR 10-30%]
Coefficient of Variation (CV): 0.83 [POOR >0.3]
Median Absolute Deviation (MAD): 2.22ms [POOR >0.3]
Distribution: min=2.04ms | P25=4.21ms | P50=5.70ms | P75=11.52ms | P90=20.40ms | max=41.15ms
Shape: right-skewed (skewness=2.26) | █▂▂▁▁▁
Sample adequacy: GOOD >30 (n=50)
Interpretation: mean is approximate and most runs vary widely (RME: FAIR 10-30%,
  CV: POOR >0.3, MAD: POOR >0.3) — increase iterations and investigate
  environment stability. CI upper bound (10.85ms) exceeds your 10ms threshold —
  the true mean likely exceeds your budget, consider optimizing the code or
  raising the threshold
```

The diagnostics include:
- **Summary statistics** — mean, median, standard deviation, sample size
- **Confidence Interval (CI)** — the range `[lower, upper]ms` where the true mean likely falls. Uses Student's t-distribution for n <= 30, z-distribution for n >= 31
- **Relative Margin of Error (RME)** — margin of error as a percentage of the mean, with classification tag (`[GOOD <10%]`/`[FAIR 10-30%]`/`[POOR >30%]`)
- **Coefficient of Variation (CV)** — standard deviation relative to the mean, with classification tag (`[GOOD <0.1]`/`[FAIR 0.1-0.3]`/`[POOR >0.3]`)
- **Median Absolute Deviation (MAD)** — robust dispersion measure (median of absolute deviations from the median), with classification tag. When CV is POOR but MAD is LOW, outliers are inflating variance — the interpretation recommends enabling `outliers: 'remove'`
- **Distribution percentiles** — min, P25, P50, P75, P90, max
- **Distribution shape** — skewness value, shape classification (symmetric, left-skewed, right-skewed, bimodal, constant), and an ASCII sparkline histogram for at-a-glance visualization. Shape diagnostics are most reliable with n > 100; smaller samples produce noisier sparklines and less stable labels
- **Sample adequacy** — classifies sample size as `POOR` (< 10), `FAIR` (10-30), or `GOOD` (> 30)
- **Interpretation** — single-sentence summary of result reliability based on the RME × CV × MAD matrix
- **Warnings** — contextual alerts (e.g., small sample size, empty dataset)

### Comparative matcher diagnostics

When a comparative matcher (`toBeFasterThan` / `toResolveFasterThan`) fails, it outputs diagnostics for both functions and a statistical comparison:

```
expected Function A to be faster than Function B,
but no statistically significant difference was found (p=0.1410 >= α=0.05)

--- Function A ---
Statistics (n=100): mean=12.45ms, median=11.80ms, stddev=3.21ms
Confidence Interval (CI): 95% [11.81, 13.09]ms
Relative Margin of Error (RME): 5.14% [GOOD <10%]
Coefficient of Variation (CV): 0.26 [FAIR 0.1-0.3]
Median Absolute Deviation (MAD): 1.50ms [FAIR 0.1-0.3]
Distribution: min=6.20ms | P25=10.30ms | P50=11.80ms | P75=14.10ms | P90=16.80ms | max=22.40ms
Shape: right-skewed (skewness=0.84) | ▂▅█▇▅▃▂▁▁
...

--- Function B ---
Statistics (n=100): mean=13.02ms, median=12.50ms, stddev=4.10ms
...

--- Comparison ---
Mean difference: -0.57ms (Function A is faster by 0.57ms, 4.4%)
Welch's t-test: t=-1.08, df=188.3, p=0.1410 (one-sided)
Confidence interval for difference: 95% [-1.61, 0.47]ms
Result: no statistically significant evidence that Function A is faster
  than Function B (p=0.1410 >= α=0.05). Function A trends faster by
  0.57ms (4.4%) but the difference could be due to chance — increase
  iterations for more statistical power
```

The comparative diagnostics include:
- **Per-function stats** — full diagnostics for each function (same format as quantile matchers: mean, CI, RME, CV, MAD, distribution, shape, interpretation)
- **Mean difference** — raw difference in milliseconds and as a percentage
- **Welch's t-test** — t-statistic, degrees of freedom (Welch-Satterthwaite), and one-sided p-value
- **Confidence interval for the difference** — if this interval excludes zero, the functions have meaningfully different performance
- **Result interpretation** — considers data reliability (POOR RME warnings), statistical significance (p-value vs α), and practical significance (percentage difference)

### Comparative testing tips

- **Use >= 30 iterations** per function for reliable t-test results
- **Add warmup** to stabilize both functions before comparison
- **Enable outlier removal** (`outliers: 'remove'`) when comparing I/O-bound operations
- **Use `setupEach`** to provide fresh data for each iteration — prevents mutation in one function from affecting the other
- **Check practical significance** — a significant p-value (< α) means Function A is statistically faster, but check the percentage difference to decide if it matters in practice
- **If the CI for the difference includes zero** — the functions may have equivalent performance; increase iterations for more statistical power

### How to use each metric

**95% Confidence Interval (CI)** — the range `[lower, upper]ms` where the true average execution time likely falls. If your performance budget is 50ms, check that the CI upper bound is below 50ms. If the upper bound is 55ms, there's a real chance the code is too slow even if the measured mean looks fine. The interpretation line will flag this automatically.

**RME (Relative Margin of Error)** — how much the mean might shift if you ran the benchmark again. A low RME means you can trust the mean; a high RME means you need more data.

| RME tag | Value | What it means |
|---|---|---|
| `[GOOD <10%]` | < 10% | Mean is stable — small regressions are detectable |
| `[FAIR 10-30%]` | 10–30% | Mean is approximate — only large regressions are detectable |
| `[POOR >30%]` | > 30% | Mean is unreliable — you need more iterations |

**CV (Coefficient of Variation)** — how consistent individual runs are, independent of the mean. Even with a precise mean (GOOD RME), a POOR CV means some runs are much slower than others. Investigate warmup, GC pauses, or I/O contention.

| CV tag | Value | What it means |
|---|---|---|
| `[GOOD <0.1]` | < 0.1 | Very consistent — low run-to-run variance |
| `[FAIR 0.1-0.3]` | 0.1–0.3 | Moderate variance — typical for I/O-bound code |
| `[POOR >0.3]` | > 0.3 | High variance — runs differ by more than 30% of the mean |

**MAD (Median Absolute Deviation)** — a robust measure of dispersion: `median(|xi - median(x)|)`. Unlike standard deviation, MAD has a 50% breakdown point — it is not inflated by outliers. It is normalized by the median (`MAD / |median|`) for classification.

| MAD tag | Value | What it means |
|---|---|---|
| `[GOOD <0.1]` | < 0.1 | Low dispersion — most runs cluster tightly around the median |
| `[FAIR 0.1-0.3]` | 0.1–0.3 | Moderate dispersion |
| `[POOR >0.3]` | > 0.3 | High dispersion — runs are spread widely even by the robust measure |

MAD is most useful when CV is POOR — it disambiguates the *cause* of high variance:
- **CV POOR + MAD LOW** → a few extreme outliers are inflating stddev. Fix: enable `outliers: 'remove'`
- **CV POOR + MAD HIGH** → runs are genuinely inconsistent. Fix: investigate noise sources (GC, I/O, scheduling)

### Reading them together

The interpretation line combines RME, CV, MAD, and CI into a single recommendation:

| RME | CV | MAD | Interpretation |
|-----|-----|-----|----------------|
| GOOD | GOOD | — | Precise and consistent — safe for regression detection |
| GOOD | FAIR | — | Reliable — moderate run-to-run variance is expected |
| GOOD | POOR | GOOD/FAIR | Precise mean but outliers inflating variance — enable outlier removal |
| GOOD | POOR | POOR | Precise mean but genuinely inconsistent — investigate noise sources |
| FAIR | FAIR/GOOD | — | Usable for rough comparison — increase iterations for tighter estimates |
| FAIR | POOR | GOOD/FAIR | Approximate mean; outliers inflating variance — enable outlier removal + increase iterations |
| FAIR | POOR | POOR | Approximate mean; runs genuinely inconsistent — increase iterations + investigate environment |
| POOR | any | — | Mean is not reliable — increase iterations, add warmup, or enable outlier removal |

When a CI bound is provided, the interpretation also checks whether the confidence interval exceeds your threshold — telling you if the true mean might exceed your performance budget.

**When you see `[POOR]` tags**, try these in order:

1. **Increase iterations** — more data reduces RME and stabilizes the CI
2. **Add warmup iterations** — exclude JIT and cache effects that inflate CV
3. **Enable outlier removal** (`outliers: 'remove'`) — filter GC pauses that inflate CV
4. **Widen your threshold** — accept that the code path has inherent variance

## Test stability / CI notes

Performance tests are inherently noisier than functional tests. Here are guidelines for reliable results:

- **Use >= 30 iterations** for statistical confidence (enables z-distribution CI instead of Student's t)
- **Use quantiles instead of single-run thresholds** — P95 absorbs occasional spikes without failing the build
- **Add warmup iterations** (3–5) to exclude JIT compilation and cache-warming overhead
- **Use outlier removal** (`outliers: 'remove'`) to filter GC pauses and OS scheduling jitter
- **Set generous thresholds** in CI — shared runners have variable performance; allow 2–3x headroom over local measurements

## When NOT to use this

- **Microbenchmarking at CPU-instruction level** — use [Benchmark.js](https://benchmarkjs.com/) or [tinybench](https://github.com/tinylibs/tinybench) for that
- **Browser performance** — this library uses `process.hrtime()`, which is Node.js only
- **Profiling and flame graphs** — use Node.js inspector or clinic.js for detailed profiling
- **Production monitoring** — this is for tests, not runtime telemetry

## Exported utilities

The library exports utility functions that you can use independently:

### `calcStats(data: number[]): Stats`

Compute summary statistics for a dataset:

```ts
import { calcStats } from 'jest-performance-matchers/metrics';

const durations = [4.2, 5.1, 4.8, 5.5, 4.9, 5.3, 5.0, 4.7];
const stats = calcStats(durations);

console.log(stats.mean);               // 4.9375
console.log(stats.stddev);             // 0.41...
console.log(stats.confidenceInterval); // [4.59, 5.28]
console.log(stats.confidenceMethod);   // "t" (small sample)
```

### `calcQuantile(q: number, data: number[]): number`

Compute a percentile value (1-100) from a dataset using linear interpolation:

```ts
import { calcQuantile } from 'jest-performance-matchers/metrics';

const durations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
calcQuantile(50, durations);  // 5.5  (median)
calcQuantile(90, durations);  // 9.1  (P90)
calcQuantile(95, durations);  // 9.55 (P95)
```

### `removeOutliers(data: number[]): number[]`

Remove statistical outliers using the IQR (Interquartile Range) method. Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are excluded:

```ts
import { removeOutliers } from 'jest-performance-matchers/metrics';

const durations = [5, 5.1, 5.2, 5.0, 4.9, 50];  // 50 is an outlier
const cleaned = removeOutliers(durations);          // [5, 5.1, 5.2, 5.0, 4.9]
```

### `calcShapeDiagnostics(data: number[], skewness: number | null, stddev: number | null): ShapeDiagnostics`

Classify the distribution shape and generate a sparkline histogram:

```ts
import { calcShapeDiagnostics } from 'jest-performance-matchers/shape';
import { calcStats } from 'jest-performance-matchers/metrics';

const durations = [4.2, 5.1, 4.8, 5.5, 4.9, 5.3, 5.0, 4.7];
const stats = calcStats(durations);
const shape = calcShapeDiagnostics(durations, stats.skewness, stats.stddev);

console.log(shape.label);     // "symmetric"
console.log(shape.sparkline); // "▁▃▇█▅▃▂▁▁▁" (ASCII histogram)
```

Shape labels: `"symmetric"`, `"left-skewed"`, `"right-skewed"`, `"bimodal"`, `"constant"`, `"insufficient data"`.

> **Note:** Shape diagnostics are most reliable with n > 100. Smaller samples produce noisier sparklines and less stable shape labels.

### `welchTTest(statsA: Stats, statsB: Stats, confidence: number): WelchTTestResult`

Perform Welch's t-test comparing two independent samples. Tests H1: meanA < meanB (Function A is faster) using a one-sided test:

```ts
import { welchTTest, calcStats } from 'jest-performance-matchers/metrics';

const statsA = calcStats([5.1, 4.9, 5.0, 5.2, 4.8]);
const statsB = calcStats([15.1, 14.9, 15.0, 15.2, 14.8]);
const result = welchTTest(statsA, statsB, 0.95);

console.log(result.t);               // -63.25 (negative = Function A is faster)
console.log(result.pValue);          // ~0 (highly significant)
console.log(result.meanDifference);  // -10 (Function A is 10ms faster)
console.log(result.df);              // ~8 (Welch-Satterthwaite degrees of freedom)
console.log(result.confidenceInterval); // [-10.35, -9.65] (CI for the difference)
```

### `WelchTTestResult` interface

| Field | Type | Description |
|---|---|---|
| `t` | `number` | t-statistic. Negative when Function A is faster |
| `df` | `number` | Welch-Satterthwaite degrees of freedom |
| `pValue` | `number` | One-sided p-value. Small when Function A is genuinely faster |
| `meanDifference` | `number` | meanA - meanB. Negative when Function A is faster |
| `standardError` | `number` | Standard error of the difference |
| `confidenceInterval` | `[number, number]` | CI for the mean difference at the given confidence level |

### `Stats` interface

The `Stats` interface returned by `calcStats()`:

| Field | Type | Description |
|---|---|---|
| `n` | `number` | Sample size |
| `min` | `number \| null` | Minimum value |
| `max` | `number \| null` | Maximum value |
| `mean` | `number \| null` | Arithmetic mean |
| `median` | `number \| null` | Median (P50) |
| `stddev` | `number \| null` | Sample standard deviation (Bessel's correction). `null` for n <= 1 |
| `marginOfError` | `number \| null` | Margin of error for the 95% CI |
| `relativeMarginOfError` | `number \| null` | RME as a percentage of the mean |
| `confidenceInterval` | `[number, number] \| null` | 95% CI [lower, upper] for the mean |
| `coefficientOfVariation` | `number \| null` | CV (stddev / \|mean\|) |
| `skewness` | `number \| null` | Sample skewness (adjusted Fisher-Pearson G1). `null` for n < 3 or stddev = 0 |
| `mad` | `number \| null` | Median Absolute Deviation: `median(\|xi - median(x)\|)`. `null` for n = 1 |
| `isSmallSample` | `boolean` | `true` when n <= 30 |
| `confidenceMethod` | `"z" \| "t" \| null` | Distribution used for the CI |
| `confidenceCriticalValue` | `number \| null` | Critical value used for the CI |
| `warnings` | `string[]` | Contextual warnings about the dataset |

Fields are `null` when there is insufficient data to compute them (e.g., `stddev` is `null` for a single data point).

## Mental model

1. **Measure multiple runs** — a single execution is noisy; use `iterations` for stable data
2. **Assert on quantiles** — P95 means "95% of runs were this fast or faster"
3. **Warm up, then measure** — let JIT and caches stabilize before collecting data

## How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT License](./LICENSE)
