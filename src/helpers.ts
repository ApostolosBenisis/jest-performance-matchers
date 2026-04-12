import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile, calcStats, removeOutliers, Stats, welchTTest, WelchTTestResult} from "./metrics";
import {calcShapeDiagnostics} from "./shape";
import {
  classifyRME,
  classifyCV,
  classifyMAD,
  classifySampleAdequacy,
  generateInterpretation,
  generateComparisonInterpretation,
  generateThroughputInterpretation,
  formatTag,
  formatPValue,
} from "./diagnostics";
import {formatMs} from "./format";
export {formatMs} from "./format";

export interface ErrorInfo {
  errorCount: number;
  totalIterations: number;
  allowedRate: number;
}

export function formatStatValue(value: number | null): string {
  return value === null ? 'N/A' : formatMs(value);
}

export function formatStatsBlock(stats: Stats, durations: number[], expectedDuration?: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo): string {
  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);

  const ciText = stats.confidenceInterval === null
    ? 'Confidence Interval (CI): N/A (insufficient data)'
    : `Confidence Interval (CI): 95% [${formatMs(stats.confidenceInterval[0])}, ${formatMs(stats.confidenceInterval[1])}]ms`;
  const rmeText = stats.relativeMarginOfError === null || rmeTag === null
    ? 'Relative Margin of Error (RME): N/A'
    : `Relative Margin of Error (RME): ${stats.relativeMarginOfError.toFixed(2)}% [${formatTag(rmeTag)}]`;
  const cvText = stats.coefficientOfVariation === null || cvTag === null
    ? 'Coefficient of Variation (CV): N/A'
    : `Coefficient of Variation (CV): ${stats.coefficientOfVariation.toFixed(2)} [${formatTag(cvTag)}]`;

  const p25 = calcQuantile(25, durations);
  const p50 = stats.median;
  const p75 = calcQuantile(75, durations);
  const p90 = calcQuantile(90, durations);

  const shapeDiag = calcShapeDiagnostics(durations, stats.skewness, stats.stddev);
  const skewnessText = stats.skewness === null ? 'N/A' : stats.skewness.toFixed(2);

  const madTag = classifyMAD(stats.mad, stats.median);
  let madText: string;
  if (stats.mad === null) {
    madText = 'Median Absolute Deviation (MAD): N/A';
  } else {
    const madTagSuffix = madTag === null ? '' : ` [${formatTag(madTag)}]`;
    madText = `Median Absolute Deviation (MAD): ${formatMs(stats.mad)}ms${madTagSuffix}`;
  }

  const lines = [
    `Statistics (n=${stats.n}${setupTeardownActive ? ', setup/teardown active' : ''}): mean=${formatStatValue(stats.mean)}ms, median=${formatStatValue(stats.median)}ms, stddev=${formatStatValue(stats.stddev)}ms`,
    ciText,
    rmeText,
    cvText,
    madText,
    `Distribution: min=${formatStatValue(stats.min)}ms | P25=${formatStatValue(p25)}ms | P50=${formatStatValue(p50)}ms | P75=${formatStatValue(p75)}ms | P90=${formatStatValue(p90)}ms | max=${formatStatValue(stats.max)}ms`,
    `Shape: ${shapeDiag.label} (skewness=${skewnessText}) | ${shapeDiag.sparkline}`,
    `Sample adequacy: ${formatTag(classifySampleAdequacy(stats.n))} (n=${stats.n})`,
    `Interpretation: ${generateInterpretation(stats, expectedDuration, errorInfo)}`,
  ];

  if (errorInfo !== undefined && errorInfo.errorCount > 0) {
    const actualRate = (errorInfo.errorCount / errorInfo.totalIterations * 100).toFixed(1);
    const allowedRate = (errorInfo.allowedRate * 100).toFixed(1);
    lines.push(`Error rate: ${errorInfo.errorCount}/${errorInfo.totalIterations} (${actualRate}%) [within ${allowedRate}% tolerance]`);
  }

  if (stats.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of stats.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}

export interface QuantileResultsOptions {
  durations: number[]; count: number; quantile: number;
  errorCount: number; allowedErrorRate: number;
  expectedDurationInMilliseconds: number;
  setupTeardownActive: boolean; removeOutliersEnabled: boolean;
}

export function processQuantileResults(opts: QuantileResultsOptions): { message: () => string; pass: boolean } {
  const {durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled} = opts;
  if (durations.length === 0) {
    return {
      pass: false,
      message: () => `all ${count} iterations failed (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`,
    };
  }

  const actualErrorRate = errorCount / count;
  if (actualErrorRate > allowedErrorRate) {
    return {
      pass: false,
      message: () => `error rate ${errorCount}/${count} (${(actualErrorRate * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`,
    };
  }

  const effectiveDurations = removeOutliersEnabled ? removeOutliers(durations) : durations;
  if (effectiveDurations.length === 0) {
    return {
      pass: false,
      message: () => `all ${durations.length} successful iterations were removed as outliers after error exclusion`,
    };
  }
  const quantileValue = calcQuantile(quantile, effectiveDurations);
  const errorInfo: ErrorInfo | undefined = errorCount > 0 ? {
    errorCount,
    totalIterations: count,
    allowedRate: allowedErrorRate
  } : undefined;
  return assertDurationQuantile(count, quantile, quantileValue, effectiveDurations, expectedDurationInMilliseconds, setupTeardownActive, errorInfo);
}

export function assertDurationQuantile(iterations: number, quantile: number, quantileValue: number, durations: number[], expectedDurationInMilliseconds: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo) {
  const stats = calcStats(durations);
  const statsBlock = formatStatsBlock(stats, durations, expectedDurationInMilliseconds, setupTeardownActive, errorInfo);

  if (quantileValue <= expectedDurationInMilliseconds) {
    return {
      message: () =>
        `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be greater than ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\n\n${statsBlock}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be less or equal to ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\n\n${statsBlock}`,
      pass: false,
    };
  }
}

export function assertDuration(actualDuration: number, expectedDurationInMilliseconds: number) {
  if (actualDuration <= expectedDurationInMilliseconds) {
    return {
      message: () =>
        `expected function duration ${printReceived(actualDuration)} (ms) to be greater than ${printExpected(expectedDurationInMilliseconds)} (ms)`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected function duration ${printReceived(actualDuration)} (ms) to be less or equal to ${printExpected(expectedDurationInMilliseconds)} (ms)`,
      pass: false,
    };
  }
}

function formatTStatistic(t: number): string {
  if (t === Infinity) return 'Infinity';
  if (t === -Infinity) return '-Infinity';
  return t.toFixed(2);
}

function formatDirection(meanDifference: number, absDiff: number, pctDiff: number): string {
  if (meanDifference === 0) return `Mean difference: ${formatMs(0)}ms (identical means)`;
  const dir = meanDifference < 0 ? 'faster' : 'slower';
  return `Mean difference: ${formatMs(meanDifference)}ms (Function A is ${dir} by ${formatMs(absDiff)}ms, ${pctDiff.toFixed(1)}%)`;
}

export interface ComparativeStatsBlockOptions {
  statsA: Stats; statsB: Stats;
  durationsA: number[]; durationsB: number[];
  tTest: WelchTTestResult; confidence: number;
  setupTeardownActive: boolean;
  errorInfoA?: ErrorInfo; errorInfoB?: ErrorInfo;
}

export function formatComparativeStatsBlock(opts: ComparativeStatsBlockOptions): string {
  const {statsA, statsB, durationsA, durationsB, tTest, confidence, setupTeardownActive, errorInfoA, errorInfoB} = opts;
  const blockA = formatStatsBlock(statsA, durationsA, undefined, setupTeardownActive, errorInfoA);
  const blockB = formatStatsBlock(statsB, durationsB, undefined, setupTeardownActive, errorInfoB);

  const absDiff = Math.abs(tTest.meanDifference);
  const meanB = statsB.mean as number; // guaranteed non-null: callers ensure n >= 2
  const pctDiff = meanB === 0 ? 0 : (absDiff / Math.abs(meanB)) * 100;

  const lines = [
    '--- Function A ---',
    blockA,
    '',
    '--- Function B ---',
    blockB,
    '',
    '--- Comparison ---',
    formatDirection(tTest.meanDifference, absDiff, pctDiff),
    `Welch's t-test: t=${formatTStatistic(tTest.t)}, df=${tTest.df.toFixed(1)}, p=${formatPValue(tTest.pValue)} (one-sided)`,
    `Confidence interval for difference: ${(confidence * 100).toFixed(0)}% [${formatMs(tTest.confidenceInterval[0])}, ${formatMs(tTest.confidenceInterval[1])}]ms`,
    `Result: ${generateComparisonInterpretation(statsA, statsB, tTest, confidence)}`,
  ];

  return lines.join('\n');
}

export interface ComparativeResultsOptions {
  durationsA: number[]; durationsB: number[];
  count: number;
  errorCountA: number; errorCountB: number;
  allowedErrorRate: number; confidence: number;
  setupTeardownActive: boolean; removeOutliersEnabled: boolean;
}

export function processComparativeResults(opts: ComparativeResultsOptions): { message: () => string; pass: boolean } {
  const {durationsA, durationsB, count, errorCountA, errorCountB, allowedErrorRate, confidence, setupTeardownActive, removeOutliersEnabled} = opts;
  // Check all-failed per function
  if (durationsA.length === 0) {
    return {pass: false, message: () => `Function A: all ${count} iterations failed (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`};
  }
  if (durationsB.length === 0) {
    return {pass: false, message: () => `Function B: all ${count} iterations failed (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`};
  }

  // Check error rate per function
  const errorRateA = errorCountA / count;
  if (errorRateA > allowedErrorRate) {
    return {pass: false, message: () => `Function A: error rate ${errorCountA}/${count} (${(errorRateA * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`};
  }
  const errorRateB = errorCountB / count;
  if (errorRateB > allowedErrorRate) {
    return {pass: false, message: () => `Function B: error rate ${errorCountB}/${count} (${(errorRateB * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`};
  }

  // Remove outliers if enabled
  const effectiveA = removeOutliersEnabled ? removeOutliers(durationsA) : durationsA;
  /* istanbul ignore next -- defensive guard: Tukey's fences cannot remove all points from a homogeneous dataset */
  if (effectiveA.length === 0) {
    return {pass: false, message: () => `Function A: all ${durationsA.length} successful iterations were removed as outliers`};
  }
  const effectiveB = removeOutliersEnabled ? removeOutliers(durationsB) : durationsB;
  /* istanbul ignore next -- defensive guard: Tukey's fences cannot remove all points from a homogeneous dataset */
  if (effectiveB.length === 0) {
    return {pass: false, message: () => `Function B: all ${durationsB.length} successful iterations were removed as outliers`};
  }

  // Check minimum sample size for t-test
  if (effectiveA.length < 2) {
    return {pass: false, message: () => `Function A: insufficient data after processing (n=${effectiveA.length}); Welch's t-test requires at least 2 data points per function`};
  }
  if (effectiveB.length < 2) {
    return {pass: false, message: () => `Function B: insufficient data after processing (n=${effectiveB.length}); Welch's t-test requires at least 2 data points per function`};
  }

  const statsA = calcStats(effectiveA);
  const statsB = calcStats(effectiveB);
  const tTest = welchTTest(statsA, statsB, confidence);
  const alpha = 1 - confidence;
  const pass = tTest.pValue < alpha;

  const errorInfoA: ErrorInfo | undefined = errorCountA > 0 ? {errorCount: errorCountA, totalIterations: count, allowedRate: allowedErrorRate} : undefined;
  const errorInfoB: ErrorInfo | undefined = errorCountB > 0 ? {errorCount: errorCountB, totalIterations: count, allowedRate: allowedErrorRate} : undefined;

  const statsBlock = formatComparativeStatsBlock({statsA, statsB, durationsA: effectiveA, durationsB: effectiveB, tTest, confidence, setupTeardownActive, errorInfoA, errorInfoB});

  if (pass) {
    return {
      pass: true,
      message: () => `expected Function A NOT to be faster than Function B,\nbut A is statistically significantly faster (p=${tTest.pValue < 0.0001 ? '<0.0001' : tTest.pValue.toFixed(4)} < α=${alpha.toFixed(2)})\n\n${statsBlock}`,
    };
  }
  return {
    pass: false,
    message: () => `expected Function A to be faster than Function B,\nbut no statistically significant difference was found (p=${tTest.pValue.toFixed(4)} >= α=${alpha.toFixed(2)})\n\n${statsBlock}`,
  };
}

export interface ThroughputResultsOptions {
  durations: number[];
  totalOps: number;
  errorCount: number;
  allowedErrorRate: number;
  expectedOpsPerSecond: number;
  duration: number;
  setupTeardownActive: boolean;
  removeOutliersEnabled: boolean;
}

export function processThroughputResults(opts: ThroughputResultsOptions): { message: () => string; pass: boolean } {
  const {durations, totalOps, errorCount, allowedErrorRate, expectedOpsPerSecond, duration, setupTeardownActive, removeOutliersEnabled} = opts;

  if (durations.length === 0) {
    return {
      pass: false,
      message: () => `all ${totalOps} operations failed (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`,
    };
  }

  /* istanbul ignore next -- defensive guard: totalOps is always > 0 when durations is non-empty */
  const actualErrorRate = totalOps > 0 ? errorCount / totalOps : 0;
  if (actualErrorRate > allowedErrorRate) {
    return {
      pass: false,
      message: () => `error rate ${errorCount}/${totalOps} (${(actualErrorRate * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`,
    };
  }

  const effectiveDurations = removeOutliersEnabled ? removeOutliers(durations) : durations;
  /* istanbul ignore next -- defensive guard: Tukey's fences cannot remove all points from a homogeneous dataset */
  if (effectiveDurations.length === 0) {
    return {
      pass: false,
      message: () => `all ${durations.length} successful operations were removed as outliers after error exclusion`,
    };
  }

  const stats = calcStats(effectiveDurations);
  // Use pre-removal count for throughput: outlier removal cleans per-op stats, not the actual ops completed
  const actualOpsPerSecond = (durations.length / duration) * 1000;
  const pass = actualOpsPerSecond >= expectedOpsPerSecond;
  const pctOfTarget = (actualOpsPerSecond / expectedOpsPerSecond) * 100;

  const errorInfo: ErrorInfo | undefined = errorCount > 0 ? {errorCount, totalIterations: totalOps, allowedRate: allowedErrorRate} : undefined;
  const statsBlock = formatThroughputStatsBlock({stats, durations: effectiveDurations, actualOpsPerSecond, expectedOpsPerSecond, duration, totalOps: durations.length, setupTeardownActive, errorInfo});

  if (pass) {
    return {
      pass: true,
      message: () => `expected function NOT to achieve at least ${printExpected(Math.round(expectedOpsPerSecond))} ops/sec,\nbut it achieved ${printReceived(Math.round(actualOpsPerSecond))} ops/sec (${pctOfTarget.toFixed(1)}% of target)\n\n${statsBlock}`,
    };
  }
  return {
    pass: false,
    message: () => `expected function to achieve at least ${printExpected(Math.round(expectedOpsPerSecond))} ops/sec,\ninstead it achieved ${printReceived(Math.round(actualOpsPerSecond))} ops/sec (${pctOfTarget.toFixed(1)}% of target)\n\n${statsBlock}`,
  };
}

interface ThroughputStatsBlockOptions {
  stats: Stats;
  durations: number[];
  actualOpsPerSecond: number;
  expectedOpsPerSecond: number;
  duration: number;
  totalOps: number;
  setupTeardownActive: boolean;
  errorInfo?: ErrorInfo;
}

function formatThroughputCI(confidenceInterval: [number, number] | null): string {
  if (confidenceInterval === null) {
    return '  CI 95%: N/A (insufficient data)';
  }
  const [ciLower, ciUpper] = confidenceInterval;
  if (ciLower <= 0) {
    return '  CI 95%: N/A (per-op CI lower bound is non-positive)';
  }
  const throughputLower = 1000 / ciUpper;
  const throughputUpper = 1000 / ciLower;
  return `  CI 95%: [${Math.round(throughputLower)}, ${Math.round(throughputUpper)}] ops/sec`;
}

function formatTargetComparison(actualOpsPerSecond: number, expectedOpsPerSecond: number): string {
  const diff = actualOpsPerSecond - expectedOpsPerSecond;
  const absDiff = Math.abs(diff);
  const pctDiff = (absDiff / expectedOpsPerSecond) * 100;
  const label = diff >= 0 ? 'surplus' : 'shortfall';
  return `  Target: ${Math.round(expectedOpsPerSecond)} ops/sec — ${label} of ${Math.round(absDiff)} ops/sec (${pctDiff.toFixed(1)}%)`;
}

function formatPerOpTimingSection(stats: Stats, durations: number[], setupTeardownActive: boolean): string[] {
  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);
  const madTag = classifyMAD(stats.mad, stats.median);

  const ciText = stats.confidenceInterval === null
    ? 'N/A (insufficient data)'
    : `[${formatMs(stats.confidenceInterval[0])}, ${formatMs(stats.confidenceInterval[1])}]ms`;
  const rmeText = stats.relativeMarginOfError === null || rmeTag === null
    ? 'N/A'
    : `${stats.relativeMarginOfError.toFixed(2)}% [${formatTag(rmeTag)}]`;
  const cvText = stats.coefficientOfVariation === null || cvTag === null
    ? 'N/A'
    : `${stats.coefficientOfVariation.toFixed(2)} [${formatTag(cvTag)}]`;

  const p25 = calcQuantile(25, durations);
  const p50 = stats.median;
  const p75 = calcQuantile(75, durations);
  const p90 = calcQuantile(90, durations);

  const shapeDiag = calcShapeDiagnostics(durations, stats.skewness, stats.stddev);
  const skewnessText = stats.skewness === null ? 'N/A' : stats.skewness.toFixed(2);

  let madText: string;
  if (stats.mad === null) {
    madText = 'N/A';
  } else {
    /* istanbul ignore next -- defensive guard: madTag is null only when median is 0, which implies mad is 0, not a realistic throughput scenario */
    const madTagSuffix = madTag === null ? '' : ` [${formatTag(madTag)}]`;
    madText = `${formatMs(stats.mad)}ms${madTagSuffix}`;
  }

  return [
    `Per-operation timing (n=${stats.n}${setupTeardownActive ? ', setup/teardown active' : ''}): mean=${formatStatValue(stats.mean)}ms, median=${formatStatValue(stats.median)}ms, stddev=${formatStatValue(stats.stddev)}ms, MAD=${madText}`,
    `  CI 95%: ${ciText} | RME: ${rmeText} | CV: ${cvText}`,
    `  Distribution: min=${formatStatValue(stats.min)}ms | P25=${formatStatValue(p25)}ms | P50=${formatStatValue(p50)}ms | P75=${formatStatValue(p75)}ms | P90=${formatStatValue(p90)}ms | max=${formatStatValue(stats.max)}ms`,
    `  Shape: ${shapeDiag.label} (skewness=${skewnessText}) | ${shapeDiag.sparkline}`,
  ];
}

function formatThroughputStatsBlock(opts: ThroughputStatsBlockOptions): string {
  const {stats, durations, actualOpsPerSecond, expectedOpsPerSecond, duration, totalOps, setupTeardownActive, errorInfo} = opts;

  const interpretation = generateThroughputInterpretation(stats, actualOpsPerSecond, expectedOpsPerSecond, errorInfo);

  const lines = [
    `Throughput: ${Math.round(actualOpsPerSecond)} ops/sec over ${Math.round(duration)}ms (${totalOps} total operations)`,
    formatThroughputCI(stats.confidenceInterval),
    formatTargetComparison(actualOpsPerSecond, expectedOpsPerSecond),
    '',
    ...formatPerOpTimingSection(stats, durations, setupTeardownActive),
    '',
    `Interpretation: ${interpretation}`,
  ];

  if (errorInfo !== undefined && errorInfo.errorCount > 0) {
    const actualRate = (errorInfo.errorCount / errorInfo.totalIterations * 100).toFixed(1);
    const allowedRate = (errorInfo.allowedRate * 100).toFixed(1);
    lines.push(`Error rate: ${errorInfo.errorCount}/${errorInfo.totalIterations} (${actualRate}%) [within ${allowedRate}% tolerance]`);
  }

  if (stats.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of stats.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}
