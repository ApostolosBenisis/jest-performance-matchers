# jest-performance-matchers

[![npm version](https://img.shields.io/npm/v/jest-performance-matchers)](https://www.npmjs.com/package/jest-performance-matchers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/ApostolosBenisis/jest-performance-matchers/actions/workflows/node.js.yml/badge.svg)](https://github.com/ApostolosBenisis/jest-performance-matchers/actions/workflows/node.js.yml)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=ApostolosBenisis_jest-performance-matchers&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=ApostolosBenisis_jest-performance-matchers)

```
                ┌───┐
             ┌──┤   ├──┐
             │  │   │  │
          ┌──┤  │   │  ├──┐
          │  │  │   │  │  ├──┐
       ┌──┤  │  │   │  │  │  ├──┐
       │  │  │  │   │  │  │  │  ├──┐
    ┌──┤  │  │  │   │  │  │  │  │  ├────┐
────┴──┴──┴──┴──┴───┴──┴──┴──┴──┴──┴────┴───────
         jest-performance-matchers
         Assert · Measure · Prove
```

Jest matchers for **statistically reliable** performance testing in Node.js. Measure code execution time over multiple iterations, assert on quantiles, and catch performance regressions in CI — all with zero dependencies.

```ts
// Ensure your API handler stays fast — P95 under 50ms across 100 runs
await expect(async () => {
    await handleRequest(mockReq);
}).toResolveWithinQuantile(50, { iterations: 100, quantile: 95, warmup: 5 });
```

## What is this for?

Use `jest-performance-matchers` when you need to:

- **Set performance budgets in CI** — fail the build when critical paths exceed time limits
- **Detect performance regressions** — catch slowdowns before they reach production
- **Validate with statistical confidence** — assert on percentiles (P90, P95, P99), not single flaky runs

If you already have Jest tests, adding performance assertions takes one import and one line of code.

## Why not just `Date.now()`?

| | `Date.now()` / manual timing | `jest-performance-matchers` |
|---|---|---|
| **Accuracy** | ~1ms resolution | Sub-millisecond (`process.hrtime()`) |
| **Flakiness** | Single run = noisy result | Multiple iterations + quantiles = stable |
| **Outliers** | One GC pause fails the test | IQR-based outlier removal |
| **Diagnostics** | You get a number | Mean, median, CI, percentiles, shape analysis, sparklines |
| **Warmup** | DIY or forget about it | Built-in warmup iterations |
| **Dependencies** | DIY everything | Zero deps — all math in-house |

## Why jest-performance-matchers?

- **Zero dependencies** — lightweight and safe to add; all statistics implemented in-house
- **Full TypeScript support** — type declarations included, works seamlessly with `ts-jest`
- **High-resolution timing** — `process.hrtime()` for sub-millisecond accuracy
- **Statistical rigor** — 95% confidence intervals (Student's t / z), IQR outlier detection, skewness analysis, distribution shape classification, and rich diagnostics on failure
- **Warmup iterations** — exclude JIT compilation and cache warming from measurements
- **Exported utilities** — use `calcStats()`, `calcQuantile()`, and `removeOutliers()` directly in your own code

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

## Matchers

### `.toCompleteWithin(ms)`

Assert that synchronous code runs within the given duration:

```ts
expect(() => {
    sortArray(data);
}).toCompleteWithin(10);

// Negation — assert it takes longer than the threshold
expect(() => {
    heavyComputation();
}).not.toCompleteWithin(10);
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
```

### `.toResolveWithin(ms)`

Assert that asynchronous code resolves within the given duration:

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
```

### Quantile options reference

| Option | Type | Required | Description |
|---|---|---|---|
| `iterations` | `number` | Yes | Number of measured iterations (positive integer) |
| `quantile` | `number` | Yes | Percentile threshold, 1-100 (e.g., `95` means P95) |
| `warmup` | `number` | No | Warmup iterations to run before measurement (default: `0`) |
| `outliers` | `'remove' \| 'keep'` | No | Whether to remove IQR-based outliers before computing the quantile (default: `'keep'`) |

## Failure diagnostics

When a quantile matcher fails, it outputs rich diagnostics to help you understand your performance profile:

```
expected that 95% of the time when running 100 iterations,
the function duration to be less or equal to 5 (ms),
instead it was 8.34 (ms)

Statistics (n=100): mean=6.12ms, median=5.87ms, stddev=2.45ms
95% CI: [5.63, 6.61]ms | RME: 7.99% | CV: 0.40
Distribution: min=2.10ms | P25=4.50ms | P50=5.87ms | P75=7.20ms | P90=8.10ms | max=15.30ms
Shape: right-skewed (skewness=0.85) | ▁▃▇█▅▃▂▁▁▁
```

The diagnostics include:
- **Summary statistics** — mean, median, standard deviation, sample size
- **95% confidence interval** — uses Student's t-distribution for n <= 30, z-distribution for n >= 31
- **RME (Relative Margin of Error)** — margin of error as a percentage of the mean
- **CV (Coefficient of Variation)** — standard deviation relative to the mean
- **Distribution percentiles** — min, P25, P50, P75, P90, max
- **Distribution shape** — skewness value, shape classification (symmetric, left-skewed, right-skewed, bimodal, constant), and an ASCII sparkline histogram for at-a-glance visualization. Shape diagnostics are most reliable with n > 100; smaller samples produce noisier sparklines and less stable labels
- **Warnings** — contextual alerts (e.g., small sample size, empty dataset)

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

Contributions from the community are highly appreciated. Here are ways you can contribute to this project:
1. **Reporting Issues**: If you find bugs or have suggestions, open an issue.

2. **Code Contributions**: Submit code changes through pull requests.

3. **Documentation**: Improve project documentation through pull requests.

4. **Support**: Simply give the project a star, your support is greatly appreciated!


### Getting Started

1. Fork the repository and clone it to your local environment.

2. Create a new branch for your changes.

3. Make your changes, commit them with descriptive messages, and push to your forked repository.

4. Create a **Pull Request** (PR) from your branch to the main repository.


If you have any questions, feel free to reach out. Happy coding!

## License

[MIT License](./LICENSE)
