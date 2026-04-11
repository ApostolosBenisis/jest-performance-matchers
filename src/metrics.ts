/**
 * Remove statistical outliers using the IQR (Interquartile Range) method.
 * Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are considered outliers and excluded.
 * This is the standard Tukey's fences approach used in box-plot analysis.
 * Returns a new array with outliers removed. Does not mutate the input.
 * For datasets with fewer than 4 elements, returns a copy unchanged (IQR is unreliable).
 */
export function removeOutliers(data: number[]): number[] {
  if (!Array.isArray(data)) throw new Error("Data is required and must be an array");
  if (data.length === 0) throw new Error("Data must contain at least one element");
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i])) throw new Error(`Data must contain only finite numbers, but found ${String(data[i])} at index ${i}`);
  }
  if (data.length < 4) return [...data];
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = calcQuantileOnSorted(0.25, sorted);
  const q3 = calcQuantileOnSorted(0.75, sorted);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  return data.filter(v => v >= lowerBound && v <= upperBound);
}

export function calcQuantile(q: number, data: number[]): number {
  if (!Number.isInteger(q) || q <= 0 || q > 100) throw new Error("Quantile must be an integer greater than 0 and less than or equal to 100");
  if (!Array.isArray(data)) throw new Error("Data is required and must be an array");
  if (data.length === 0) throw new Error("Data must contain at least one element");
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i])) throw new Error(`Data must contain only finite numbers, but found ${String(data[i])} at index ${i}`);
  }
  const sorted = [...data].sort((a, b) => a - b);
  return calcQuantileOnSorted(q / 100, sorted);
}

function calcQuantileOnSorted(q: number, sorted: number[]) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

export interface Stats {
  n: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  /** Sample standard deviation (Bessel's correction, divides by n-1). null for n <= 1. */
  stddev: number | null;
  /** Margin of error for a 95% confidence interval. null when CI cannot be computed. */
  marginOfError: number | null;
  /** Relative margin of error as a percentage (marginOfError / |mean| * 100). null when CI cannot be computed. */
  relativeMarginOfError: number | null;
  /** 95% confidence interval [lower, upper] for the mean. null when CI cannot be computed. */
  confidenceInterval: [number, number] | null;
  /** Coefficient of variation (stddev / |mean|). null when stddev or mean is unavailable. */
  coefficientOfVariation: number | null;
  /** Sample skewness (adjusted Fisher-Pearson G1). null when n < 3 or stddev is 0. */
  skewness: number | null;
  /** Median Absolute Deviation: median(|xi - median(x)|). null when n = 1 (single data point). */
  mad: number | null;
  /** true when n <= 30 */
  isSmallSample: boolean;
  /** The method used for the confidence interval: "z" (normal), "t" (Student's t), or null. */
  confidenceMethod: "z" | "t" | null;
  /** The actual critical value used for the confidence interval. */
  confidenceCriticalValue: number | null;
  warnings: string[];
}

// Critical values for a 95% two-sided Student's t confidence interval,
// keyed by degrees of freedom (df = n - 1). Used instead of z = 1.96
// for small samples because the t-distribution reflects extra uncertainty.
const T_CRITICAL_VALUES_95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131,
  16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086,
  21: 2.08, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.06,
  26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045
};

/**
 * Get the critical value for a 95% confidence interval.
 * Requires n >= 2 (caller must handle n < 2 separately).
 * - 2 <= n <= 30: Uses Student's t-distribution (df = n-1). The t-distribution
 *   accounts for the additional uncertainty in estimating the population stddev
 *   from a small sample. We use n >= 31 (not n >= 30) as the z threshold because
 *   at n=30 the t-value (2.045) still differs meaningfully from z (1.96).
 * - n >= 31: Uses the z-distribution (normal approximation, z = 1.96).
 */
function getCriticalValue(n: number): { method: "z" | "t"; value: number } {
  /* istanbul ignore next -- defensive guard: callers must ensure n >= 2 */
  if (n < 2) throw new Error("Critical value requires n >= 2");
  if (n >= 31) return {method: "z", value: 1.96};
  return {method: "t", value: T_CRITICAL_VALUES_95[n - 1]};
}

/**
 * Calculate summary statistics for a dataset.
 * Uses sample standard deviation (Bessel's correction, divides by n-1).
 * Confidence intervals use Student's t-distribution for n <= 30, z-distribution for n >= 31.
 */
export function calcStats(data: number[]): Stats {
  if (!Array.isArray(data)) throw new Error("Data is required and must be an array");
  if (data.length === 0) throw new Error("Data must contain at least one element");
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i])) throw new Error(`Data must contain only finite numbers, but found ${String(data[i])} at index ${i}`);
  }
  const n = data.length;
  const warnings: string[] = [];

  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = data.reduce((sum, v) => sum + v, 0) / n;
  const median = calcQuantileOnSorted(0.5, sorted);
  const isSmallSample = n <= 30;

  if (n === 1) {
    warnings.push("Single data point: standard deviation and confidence interval cannot be computed");
    if (isSmallSample) warnings.push("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");
    return {
      n, min, max, mean, median, stddev: null,
      marginOfError: null, relativeMarginOfError: null, confidenceInterval: null,
      coefficientOfVariation: null, skewness: null, mad: null, isSmallSample, confidenceMethod: null,
      confidenceCriticalValue: null, warnings
    };
  }

  if (isSmallSample) warnings.push("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");

  const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const stddev = Math.sqrt(variance);
  const {method: confidenceMethod, value: confidenceCriticalValue} = getCriticalValue(n);
  const marginOfError = confidenceCriticalValue * stddev / Math.sqrt(n);
  const relativeMarginOfError = mean === 0 ? null : (marginOfError / Math.abs(mean)) * 100;
  const confidenceInterval: [number, number] = [mean - marginOfError, mean + marginOfError];
  const coefficientOfVariation = mean === 0 ? null : stddev / Math.abs(mean);

  // Adjusted Fisher-Pearson skewness (G1): [n / ((n-1)(n-2))] * SUM[((xi - mean) / s)^3]
  let skewness: number | null = null;
  if (n >= 3 && stddev > 0) {
    const sumCubedDeviations = data.reduce((sum, v) => sum + ((v - mean) / stddev) ** 3, 0);
    skewness = (n / ((n - 1) * (n - 2))) * sumCubedDeviations;
  }

  const mad = calcQuantileOnSorted(0.5, data.map(v => Math.abs(v - median)).sort((a, b) => a - b));

  return {
    n, min, max, mean, median, stddev, marginOfError, relativeMarginOfError,
    confidenceInterval, coefficientOfVariation, skewness, mad, isSmallSample, confidenceMethod,
    confidenceCriticalValue, warnings
  };
}

export interface WelchTTestResult {
  /** t-statistic: (meanA - meanB) / SE. Negative when A is faster. */
  t: number;
  /** Welch-Satterthwaite degrees of freedom. */
  df: number;
  /** One-sided p-value: P(T <= t | H0). Small when A is genuinely faster than B. */
  pValue: number;
  /** Mean difference (meanA - meanB). Negative when A is faster. */
  meanDifference: number;
  /** Standard error of the difference. */
  standardError: number;
  /** Confidence interval for the mean difference at the given confidence level. */
  confidenceInterval: [number, number];
}

/**
 * Lanczos approximation of ln(Gamma(x)).
 * Uses the standard 7-term Lanczos series with g = 7.
 * Accurate to ~15 significant digits for x > 0.
 * @internal Exported for testability.
 */
export function lnGamma(x: number): number {
  if (x <= 0) throw new Error("lnGamma requires x > 0");
  const g = 7;
  const coefficients = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (x < 0.5) {
    // Reflection formula: Gamma(x) * Gamma(1-x) = pi / sin(pi*x)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }

  x -= 1;
  let sum = coefficients[0];
  for (let i = 1; i < g + 2; i++) {
    sum += coefficients[i] / (x + i);
  }
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}

/**
 * Regularized incomplete beta function I_x(a, b) via Lentz's continued fraction.
 * Uses the symmetry relation I_x(a,b) = 1 - I_{1-x}(b,a) for numerical stability.
 * @internal Exported for testability.
 */
export function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) throw new Error("x must be in [0, 1]");
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use symmetry for better convergence (intentionally swapping a,b parameters)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(b, a, 1 - x); // NOSONAR: parameter swap is the symmetry relation I_x(a,b) = 1 - I_{1-x}(b,a)
  }

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

  return front * continuedFractionBeta(a, b, x);
}

/** Lentz's continued fraction for the incomplete beta function. */
function continuedFractionBeta(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 1e-14;
  const tiny = 1e-30;

  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  /* istanbul ignore next -- numerical stability guard for continued fraction underflow */
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= maxIterations; m++) {
    const evenNum = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    ({d, c} = lentzStep(d, c, evenNum, tiny));
    result *= d * c;

    const oddNum = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    ({d, c} = lentzStep(d, c, oddNum, tiny));
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }

  return result;
}

/** Single step of Lentz's continued fraction algorithm. */
function lentzStep(d: number, c: number, numerator: number, tiny: number): {d: number; c: number} {
  d = 1 + numerator * d;
  /* istanbul ignore next -- numerical stability guard */
  if (Math.abs(d) < tiny) d = tiny;
  c = 1 + numerator / c;
  /* istanbul ignore next -- numerical stability guard */
  if (Math.abs(c) < tiny) c = tiny;
  d = 1 / d;
  return {d, c};
}

/**
 * CDF of Student's t-distribution: P(T <= t) for given degrees of freedom.
 * Uses the regularized incomplete beta function.
 * @internal Exported for testability.
 */
export function tDistCDF(t: number, df: number): number {
  if (df <= 0) throw new Error("Degrees of freedom must be positive");
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const ibeta = regularizedIncompleteBeta(df / 2, 0.5, x);
  return t > 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta;
}

/**
 * Inverse CDF of Student's t-distribution via bisection.
 * Finds t such that P(T <= t) = p for given degrees of freedom.
 */
function inverseTDistCDF(p: number, df: number): number {
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tDistCDF(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Perform Welch's t-test comparing two independent samples.
 * Tests H1: meanA < meanB (A is faster) using a one-sided test.
 *
 * Both Stats must have n >= 2 and non-null mean/stddev.
 * The confidence parameter controls the CI for the mean difference (0 < confidence < 1).
 */
export function welchTTest(statsA: Stats, statsB: Stats, confidence: number): WelchTTestResult {
  if (statsA.mean === null || statsA.stddev === null) throw new Error("Stats A must have n >= 2 (mean and stddev required)");
  if (statsB.mean === null || statsB.stddev === null) throw new Error("Stats B must have n >= 2 (mean and stddev required)");
  if (confidence <= 0 || confidence >= 1) throw new Error("confidence must be between 0 (exclusive) and 1 (exclusive)");

  const meanA = statsA.mean;
  const meanB = statsB.mean;
  const nA = statsA.n;
  const nB = statsB.n;
  const varA = statsA.stddev * statsA.stddev;
  const varB = statsB.stddev * statsB.stddev;

  const meanDifference = meanA - meanB;

  // Degenerate case: both variances are zero
  if (varA === 0 && varB === 0) {
    if (meanA === meanB) {
      return {t: 0, df: nA + nB - 2, pValue: 0.5, meanDifference: 0, standardError: 0, confidenceInterval: [0, 0]};
    }
    const pValue = meanA < meanB ? 0 : 1;
    return {t: meanA < meanB ? -Infinity : Infinity, df: nA + nB - 2, pValue, meanDifference, standardError: 0, confidenceInterval: [meanDifference, meanDifference]};
  }

  const se = Math.sqrt(varA / nA + varB / nB);
  const t = meanDifference / se;

  // Welch-Satterthwaite degrees of freedom
  const termA = varA / nA;
  const termB = varB / nB;
  const df = (termA + termB) ** 2 / (termA ** 2 / (nA - 1) + termB ** 2 / (nB - 1));

  const pValue = tDistCDF(t, df);

  // Two-sided CI for the mean difference
  const alpha = 1 - confidence;
  const tCrit = inverseTDistCDF(1 - alpha / 2, df);
  const ciLower = meanDifference - tCrit * se;
  const ciUpper = meanDifference + tCrit * se;

  return {t, df, pValue, meanDifference, standardError: se, confidenceInterval: [ciLower, ciUpper]};
}
