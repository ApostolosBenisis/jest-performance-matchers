# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
