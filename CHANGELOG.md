# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - YYYY-MM-DD

### Fixed
- `calcStats()` and `removeOutliers()` now validate input and throw a descriptive error on invalid data (non-array, empty array, non-number elements, NaN elements), matching `calcQuantile()`'s existing contract. Previously, `calcStats([])` silently returned an all-nulls `Stats` object; it now throws. This is a behavioral breaking change for callers relying on the empty-array graceful return.
- `calcQuantile()`, `calcStats()`, and `removeOutliers()` now correctly reject sparse arrays (e.g., `[1, , 3]`). Previously, `Array.prototype.some` skipped empty slots, allowing sparse arrays to pass validation and silently inject `NaN` into calculations.

## [1.2.0] - 2026-04-02

### Added
- IQR-based outlier detection for quantile matchers with `{ outliers: 'remove' | 'keep' }` option.
- Confidence intervals (95% CI), relative margin of error (RME%), and coefficient of variation (CV) to `calcStats()` output.
- `removeOutliers()` utility function in `src/metrics.ts`.
- `Stats` interface fields: `n`, `marginOfError`, `relativeMarginOfError`, `confidenceInterval`, `coefficientOfVariation`, `isSmallSample`, `confidenceMethod`, `confidenceCriticalValue`, `warnings`.

### Changed
- Quantile matcher failure messages now show rich multi-line diagnostics: summary stats, 95% CI, RME, CV, distribution percentiles (P25/P50/P75/P90), and contextual warnings.
- Standard deviation uses sample stddev with Bessel's correction (divides by n-1) instead of population stddev.
- Confidence intervals use Student's t-distribution for small samples (n <= 30), z-distribution for n >= 31.

## [1.1.0] - 2026-04-01

### Added
- **Warmup iterations** for quantile matchers (`toCompleteWithinQuantile`, `toResolveWithinQuantile`). Optional `warmup` parameter excludes JIT/cache warming from measurements.
- **Input validation** for all matchers — descriptive errors for invalid callback types, negative durations, out-of-range quantiles, and non-integer iterations.
- **Summary statistics** in quantile failure messages (min, max, mean, median, stddev) replacing raw duration arrays.
- `calcStats()` utility function in `src/metrics.ts`.

### Changed
- Failure messages for quantile matchers now display formatted summary statistics instead of raw comma-separated durations.
- Durations are formatted to 2 decimal places for readability.
- CI matrix updated from Node.js 14/16/18 to 18/20/22.
- GitHub Actions upgraded from v3 to v4 (`actions/checkout`, `actions/setup-node`).
- `sonarsource/sonarcloud-github-action` pinned to `v4` instead of `@master`.
- Publish workflow updated to use Node.js 20.
- Volta pin updated from 14.0.0 to 18.0.0.
- `@types/node` updated from ~14.0.0 to ~18.0.0.
- README: fixed "intall" typo, added TypeScript examples, noted Jest 29 compatibility.

### Fixed
- `calcQuantile()` no longer mutates the input array (sorts a copy instead of in-place).

### Removed
- All `@ts-ignore` comments replaced — no longer needed after failure message refactoring.
- Node.js 14 and 16 from CI matrix (both are EOL).

## [1.0.1] - 2023-04-13

### Fixed
- Return type of `toResolveWithin` and `toResolveWithinQuantile` matchers are now typed as `Promise<R>`, fixing TS80007 "await has no effect on the type of this expression" warnings.

## [1.0.0] - 2023-03-28

### Added
- Initial release.
- `toCompleteWithin` matcher for synchronous code duration assertions.
- `toCompleteWithinQuantile` matcher for synchronous code quantile-based assertions.
- `toResolveWithin` matcher for asynchronous code duration assertions.
- `toResolveWithinQuantile` matcher for asynchronous code quantile-based assertions.
- `calcQuantile` utility for percentile calculations.
- Full TypeScript type declarations via `declare global`.
