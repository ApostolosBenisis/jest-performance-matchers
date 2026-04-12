/**
 * Examples: Exported utilities
 *
 * The library exports statistical utilities that can be used independently
 * for custom analysis outside of Jest matchers.
 */
import {calcStats, calcQuantile, removeOutliers, welchTTest} from '../src/metrics';
import {calcShapeDiagnostics} from '../src/shape';

// --- calcStats ---

test('calcStats computes summary statistics for a dataset', () => {
  // Prepare a realistic timing dataset (31 measurements in milliseconds)
  const durations = [4.2, 5.1, 4.8, 5.5, 4.9, 5.3, 5.0, 4.7, 5.2, 4.6,
    5.4, 4.3, 5.1, 4.9, 5.0, 4.8, 5.3, 4.5, 5.2, 4.7,
    5.1, 4.6, 5.0, 4.9, 5.3, 4.4, 5.2, 4.8, 5.1, 5.0, 4.9];

  // Compute full statistics
  const stats = calcStats(durations);

  // Verify basic descriptive statistics
  expect(stats.n).toBe(31);
  expect(stats.mean).toBeCloseTo(4.94, 1);
  expect(stats.median).toBeCloseTo(5.0, 1);
  expect(stats.stddev).toBeGreaterThan(0);

  // Verify confidence interval uses z-distribution for n >= 31
  expect(stats.confidenceMethod).toBe('z');
  expect(stats.confidenceInterval).not.toBeNull();
  expect(stats.confidenceInterval![0]).toBeLessThan(stats.mean!);
  expect(stats.confidenceInterval![1]).toBeGreaterThan(stats.mean!);

  // Verify quality metrics
  expect(stats.relativeMarginOfError).toBeLessThan(10); // GOOD
  expect(stats.isSmallSample).toBe(false);
});

// --- calcQuantile ---

test('calcQuantile computes percentile values', () => {
  // Prepare sequential data from 1 to 100
  const durations = Array.from({length: 100}, (_, i) => i + 1);

  // Compute common percentiles
  expect(calcQuantile(50, durations)).toBeCloseTo(50.5, 1);  // Median
  expect(calcQuantile(90, durations)).toBeCloseTo(90.1, 1);  // P90
  expect(calcQuantile(95, durations)).toBeCloseTo(95.05, 1); // P95
  expect(calcQuantile(99, durations)).toBeCloseTo(99.01, 1); // P99
});

// --- removeOutliers ---

test('removeOutliers filters extreme values via Tukey fences', () => {
  // Prepare a dataset with one extreme outlier (50ms among ~5ms values)
  const durations = [5, 5.1, 5.2, 5.0, 4.9, 5.1, 5.0, 4.8, 5.3, 50];

  // Remove outliers using Tukey's fences (Q1 - 1.5*IQR, Q3 + 1.5*IQR)
  const cleaned = removeOutliers(durations);

  // Verify the extreme value is removed and the rest are kept
  expect(cleaned).not.toContain(50);
  expect(cleaned.length).toBe(9);
});

// --- welchTTest ---

test('welchTTest detects a significant difference between two samples', () => {
  // Prepare two clearly different timing datasets
  const fast = calcStats([5.1, 4.9, 5.0, 5.2, 4.8, 5.1, 5.0, 4.9, 5.2, 5.0]);
  const slow = calcStats([15.1, 14.9, 15.0, 15.2, 14.8, 15.1, 15.0, 14.9, 15.2, 15.0]);

  // Run a one-sided Welch's t-test (H1: fast < slow)
  const result = welchTTest(fast, slow, 0.95);

  // Verify the test detects that A is significantly faster
  expect(result.t).toBeLessThan(0);
  expect(result.pValue).toBeLessThan(0.001);
  expect(result.meanDifference).toBeCloseTo(-10, 0);

  // Verify the confidence interval for the difference excludes zero
  expect(result.confidenceInterval[1]).toBeLessThan(0);
});

test('welchTTest returns non-significant result for similar samples', () => {
  // Prepare two nearly identical timing datasets
  const a = calcStats([10.1, 9.9, 10.0, 10.2, 9.8, 10.1, 10.0, 9.9, 10.2, 10.0]);
  const b = calcStats([10.2, 9.8, 10.1, 10.0, 9.9, 10.0, 10.1, 10.2, 9.9, 10.0]);

  // Run a one-sided Welch's t-test
  const result = welchTTest(a, b, 0.95);

  // Verify the test does NOT find a significant difference
  expect(result.pValue).toBeGreaterThan(0.05);

  // Verify the confidence interval for the difference includes zero
  expect(result.confidenceInterval[0]).toBeLessThan(0);
  expect(result.confidenceInterval[1]).toBeGreaterThan(0);
});

// --- calcShapeDiagnostics ---

test('calcShapeDiagnostics classifies distribution shape', () => {
  // Prepare symmetric data (uniform-like)
  const symmetric = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const symStats = calcStats(symmetric);

  // Classify the shape
  const symShape = calcShapeDiagnostics(symmetric, symStats.skewness, symStats.stddev);

  // Verify it is classified as symmetric with a sparkline visualization
  expect(symShape.label).toBe('symmetric');
  expect(symShape.sparkline.length).toBeGreaterThan(0);

  // Prepare right-skewed data (many small values, few large ones — typical of GC pauses)
  const skewed = [1, 1, 2, 2, 2, 3, 3, 5, 8, 15, 25, 50];
  const skewStats = calcStats(skewed);

  // Classify the shape
  const skewShape = calcShapeDiagnostics(skewed, skewStats.skewness, skewStats.stddev);

  // Verify it is classified as right-skewed
  expect(skewShape.label).toBe('right-skewed');
});
