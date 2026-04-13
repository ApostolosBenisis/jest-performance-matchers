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
  generateComparativeThroughputInterpretation,
  hasWarningConditions,
  formatTag,
  formatPValue,
  Tag,
} from "./diagnostics";
import {formatMs} from "./format";
export {formatMs} from "./format";

export interface ErrorInfo {
  errorCount: number;
  totalIterations: number;
  allowedRate: number;
}

export type LogDiagnostics = 'INFO' | 'WARN' | 'FAIL';

const LOG_PREFIX = '[jest-performance-matchers]';

export function logDiagnosticsIfNeeded(pass: boolean, statsBlock: string, logLevel: LogDiagnostics, warnings: boolean): void {
  if (!pass) return;
  if (logLevel === 'FAIL') return;
  if (logLevel === 'INFO') {
    console.info(`${LOG_PREFIX} Diagnostics:\n${statsBlock}`);
    return;
  }
  if (warnings) {
    console.warn(`${LOG_PREFIX} Diagnostics (warnings detected):\n${statsBlock}`);
  }
}

export function formatStatValue(value: number | null): string {
  return value === null ? 'N/A' : formatMs(value);
}

/** Append the shared error-rate line and warnings list to a stats block's lines array. */
function appendErrorInfoAndWarnings(lines: string[], warnings: string[], errorInfo?: ErrorInfo): void {
  if (errorInfo !== undefined && errorInfo.errorCount > 0) {
    const actualRate = (errorInfo.errorCount / errorInfo.totalIterations * 100).toFixed(1);
    const allowedRate = (errorInfo.allowedRate * 100).toFixed(1);
    lines.push(`Error rate: ${errorInfo.errorCount}/${errorInfo.totalIterations} (${actualRate}%) [within ${allowedRate}% tolerance]`);
  }

  if (warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of warnings) {
      lines.push(`  - ${warning}`);
    }
  }
}

/** Format the CI value (without prefix). Returns 'N/A (insufficient data)' or '[lower, upper]ms'. */
function formatCIValue(ci: [number, number] | null): string {
  if (ci === null) return 'N/A (insufficient data)';
  return `[${formatMs(ci[0])}, ${formatMs(ci[1])}]ms`;
}

/** Format the RME value (without prefix). Returns 'N/A' or 'X.XX% [TAG]'. */
function formatRMEValue(rme: number | null, tag: Tag | null): string {
  if (rme === null || tag === null) return 'N/A';
  return `${rme.toFixed(2)}% [${formatTag(tag)}]`;
}

/** Format the CV value (without prefix). Returns 'N/A' or 'X.XX [TAG]'. */
function formatCVValue(cv: number | null, tag: Tag | null): string {
  if (cv === null || tag === null) return 'N/A';
  return `${cv.toFixed(2)} [${formatTag(tag)}]`;
}

type EffectiveDurationsResult =
  | { ok: true; effective: number[] }
  | { ok: false; message: string };

/** Apply outlier removal and verify minimum sample size (n >= 2) for one function in a comparative matcher. */
function prepareEffectiveDurations(
  durations: number[], removeOutliersEnabled: boolean, fnLabel: 'Function A' | 'Function B', noun: 'iterations' | 'operations',
): EffectiveDurationsResult {
  const effective = removeOutliersEnabled ? removeOutliers(durations) : durations;
  /* istanbul ignore next -- defensive guard: Tukey's fences cannot remove all points from a homogeneous dataset */
  if (effective.length === 0) {
    return {ok: false, message: `${fnLabel}: all ${durations.length} successful ${noun} were removed as outliers`};
  }
  if (effective.length < 2) {
    return {ok: false, message: `${fnLabel}: insufficient data after processing (n=${effective.length}); Welch's t-test requires at least 2 data points per function`};
  }
  return {ok: true, effective};
}

/** Build the pass/fail result with formatted message for both comparative matcher families. */
function buildComparativeResult(
  pass: boolean, alpha: number, pValue: number, statsBlock: string,
  passHeadline: string, failHeadline: string,
): { pass: boolean; message: () => string } {
  const formattedP = formatPValue(pValue);
  if (pass) {
    return {
      pass: true,
      message: () => `${passHeadline} (p=${formattedP} < α=${alpha.toFixed(2)})\n\n${statsBlock}`,
    };
  }
  return {
    pass: false,
    message: () => `${failHeadline} (p=${formattedP} >= α=${alpha.toFixed(2)})\n\n${statsBlock}`,
  };
}

export function formatStatsBlock(stats: Stats, durations: number[], expectedDuration?: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo): string {
  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);

  const ciText = stats.confidenceInterval === null
    ? 'Confidence Interval (CI): N/A (insufficient data)'
    : `Confidence Interval (CI): 95% ${formatCIValue(stats.confidenceInterval)}`;
  const rmeText = `Relative Margin of Error (RME): ${formatRMEValue(stats.relativeMarginOfError, rmeTag)}`;
  const cvText = `Coefficient of Variation (CV): ${formatCVValue(stats.coefficientOfVariation, cvTag)}`;

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

  appendErrorInfoAndWarnings(lines, stats.warnings, errorInfo);

  return lines.join('\n');
}

export interface QuantileResultsOptions {
  durations: number[]; count: number; quantile: number;
  errorCount: number; allowedErrorRate: number;
  expectedDurationInMilliseconds: number;
  setupTeardownActive: boolean; removeOutliersEnabled: boolean;
  logDiagnostics: LogDiagnostics;
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
  return assertDurationQuantile(count, quantile, quantileValue, effectiveDurations, expectedDurationInMilliseconds, setupTeardownActive, errorInfo, opts.logDiagnostics);
}

export function assertDurationQuantile(iterations: number, quantile: number, quantileValue: number, durations: number[], expectedDurationInMilliseconds: number, setupTeardownActive: boolean | undefined, errorInfo: ErrorInfo | undefined, logDiagnostics: LogDiagnostics) {
  const stats = calcStats(durations);
  const statsBlock = formatStatsBlock(stats, durations, expectedDurationInMilliseconds, setupTeardownActive, errorInfo);
  const pass = quantileValue <= expectedDurationInMilliseconds;

  logDiagnosticsIfNeeded(pass, statsBlock, logDiagnostics, hasWarningConditions(stats, expectedDurationInMilliseconds, errorInfo));

  if (pass) {
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
  logDiagnostics: LogDiagnostics;
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

  // Remove outliers if enabled and verify minimum sample size for t-test
  const checkA = prepareEffectiveDurations(durationsA, removeOutliersEnabled, 'Function A', 'iterations');
  if (!checkA.ok) return {pass: false, message: () => checkA.message};
  const checkB = prepareEffectiveDurations(durationsB, removeOutliersEnabled, 'Function B', 'iterations');
  if (!checkB.ok) return {pass: false, message: () => checkB.message};

  const statsA = calcStats(checkA.effective);
  const statsB = calcStats(checkB.effective);
  const tTest = welchTTest(statsA, statsB, confidence);
  const alpha = 1 - confidence;
  const pass = tTest.pValue < alpha;

  const errorInfoA: ErrorInfo | undefined = errorCountA > 0 ? {errorCount: errorCountA, totalIterations: count, allowedRate: allowedErrorRate} : undefined;
  const errorInfoB: ErrorInfo | undefined = errorCountB > 0 ? {errorCount: errorCountB, totalIterations: count, allowedRate: allowedErrorRate} : undefined;

  const statsBlock = formatComparativeStatsBlock({statsA, statsB, durationsA: checkA.effective, durationsB: checkB.effective, tTest, confidence, setupTeardownActive, errorInfoA, errorInfoB});

  const warnings = hasWarningConditions(statsA, undefined, errorInfoA) || hasWarningConditions(statsB, undefined, errorInfoB);
  logDiagnosticsIfNeeded(pass, statsBlock, opts.logDiagnostics, warnings);

  return buildComparativeResult(
    pass, alpha, tTest.pValue, statsBlock,
    'expected Function A NOT to be faster than Function B,\nbut A is statistically significantly faster',
    'expected Function A to be faster than Function B,\nbut no statistically significant difference was found',
  );
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
  logDiagnostics: LogDiagnostics;
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

  logDiagnosticsIfNeeded(pass, statsBlock, opts.logDiagnostics, hasWarningConditions(stats, undefined, errorInfo));

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

export function formatThroughputCI(confidenceInterval: [number, number] | null): string {
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

export function formatPerOpTimingSection(stats: Stats, durations: number[], setupTeardownActive: boolean): string[] {
  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);
  const madTag = classifyMAD(stats.mad, stats.median);

  const ciText = formatCIValue(stats.confidenceInterval);
  const rmeText = formatRMEValue(stats.relativeMarginOfError, rmeTag);
  const cvText = formatCVValue(stats.coefficientOfVariation, cvTag);

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

  appendErrorInfoAndWarnings(lines, stats.warnings, errorInfo);

  return lines.join('\n');
}

function formatThroughputFunctionBlock(
  stats: Stats, durations: number[], actualOpsPerSecond: number, totalOps: number, duration: number,
  setupTeardownActive: boolean, errorInfo?: ErrorInfo,
): string {
  const lines = [
    `Throughput: ${Math.round(actualOpsPerSecond)} ops/sec over ${Math.round(duration)}ms (${totalOps} total operations)`,
    formatThroughputCI(stats.confidenceInterval),
    '',
    ...formatPerOpTimingSection(stats, durations, setupTeardownActive),
  ];

  appendErrorInfoAndWarnings(lines, stats.warnings, errorInfo);

  return lines.join('\n');
}

function formatThroughputComparisonLine(actualOpsPerSecondA: number, actualOpsPerSecondB: number): string {
  const opsDiff = Math.abs(actualOpsPerSecondA - actualOpsPerSecondB);
  let direction: string;
  if (actualOpsPerSecondA === actualOpsPerSecondB) {
    direction = '(identical throughput)';
  } else if (actualOpsPerSecondA > actualOpsPerSecondB) {
    direction = `Function A is higher by ${Math.round(opsDiff)} ops/sec`;
  } else {
    direction = `Function A is lower by ${Math.round(opsDiff)} ops/sec`;
  }
  return `Throughput: A=${Math.round(actualOpsPerSecondA)} ops/sec, B=${Math.round(actualOpsPerSecondB)} ops/sec — ${direction}`;
}

export interface ComparativeThroughputStatsBlockOptions {
  statsA: Stats; statsB: Stats;
  durationsA: number[]; durationsB: number[];
  actualOpsPerSecondA: number; actualOpsPerSecondB: number;
  totalOpsA: number; totalOpsB: number;
  duration: number;
  tTest: WelchTTestResult; confidence: number;
  setupTeardownActive: boolean;
  errorInfoA?: ErrorInfo; errorInfoB?: ErrorInfo;
}

export function formatComparativeThroughputStatsBlock(opts: ComparativeThroughputStatsBlockOptions): string {
  const {statsA, statsB, durationsA, durationsB, actualOpsPerSecondA, actualOpsPerSecondB, totalOpsA, totalOpsB, duration, tTest, confidence, setupTeardownActive, errorInfoA, errorInfoB} = opts;
  const blockA = formatThroughputFunctionBlock(statsA, durationsA, actualOpsPerSecondA, totalOpsA, duration, setupTeardownActive, errorInfoA);
  const blockB = formatThroughputFunctionBlock(statsB, durationsB, actualOpsPerSecondB, totalOpsB, duration, setupTeardownActive, errorInfoB);

  const lines = [
    '--- Function A ---',
    blockA,
    '',
    '--- Function B ---',
    blockB,
    '',
    '--- Comparison ---',
    formatThroughputComparisonLine(actualOpsPerSecondA, actualOpsPerSecondB),
    `Welch's t-test: t=${formatTStatistic(tTest.t)}, df=${tTest.df.toFixed(1)}, p=${formatPValue(tTest.pValue)} (one-sided)`,
    `Confidence interval for per-op difference: ${(confidence * 100).toFixed(0)}% [${formatMs(tTest.confidenceInterval[0])}, ${formatMs(tTest.confidenceInterval[1])}]ms`,
    `Result: ${generateComparativeThroughputInterpretation(statsA, statsB, tTest, confidence, actualOpsPerSecondA, actualOpsPerSecondB)}`,
  ];

  return lines.join('\n');
}

export interface ComparativeThroughputResultsOptions {
  durationsA: number[]; durationsB: number[];
  totalOpsA: number; totalOpsB: number;
  errorCountA: number; errorCountB: number;
  allowedErrorRate: number; confidence: number;
  duration: number;
  setupTeardownActive: boolean; removeOutliersEnabled: boolean;
  logDiagnostics: LogDiagnostics;
}

export function processComparativeThroughputResults(opts: ComparativeThroughputResultsOptions): { message: () => string; pass: boolean } {
  const {durationsA, durationsB, totalOpsA, totalOpsB, errorCountA, errorCountB, allowedErrorRate, confidence, duration, setupTeardownActive, removeOutliersEnabled} = opts;

  // Check all-failed per function
  if (durationsA.length === 0) {
    return {pass: false, message: () => `Function A: all ${totalOpsA} operations failed during ${Math.round(duration)}ms window (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`};
  }
  if (durationsB.length === 0) {
    return {pass: false, message: () => `Function B: all ${totalOpsB} operations failed during ${Math.round(duration)}ms window (100% error rate, allowed ${(allowedErrorRate * 100).toFixed(1)}%)`};
  }

  // Check error rate per function (pre-outlier-removal counts)
  /* istanbul ignore next -- defensive guard: totalOps is always > 0 when durations is non-empty */
  const errorRateA = totalOpsA > 0 ? errorCountA / totalOpsA : 0;
  if (errorRateA > allowedErrorRate) {
    return {pass: false, message: () => `Function A: error rate ${errorCountA}/${totalOpsA} (${(errorRateA * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`};
  }
  /* istanbul ignore next -- defensive guard: totalOps is always > 0 when durations is non-empty */
  const errorRateB = totalOpsB > 0 ? errorCountB / totalOpsB : 0;
  if (errorRateB > allowedErrorRate) {
    return {pass: false, message: () => `Function B: error rate ${errorCountB}/${totalOpsB} (${(errorRateB * 100).toFixed(1)}%) exceeds allowed ${(allowedErrorRate * 100).toFixed(1)}%`};
  }

  // Remove outliers if enabled and verify minimum sample size for t-test
  const checkA = prepareEffectiveDurations(durationsA, removeOutliersEnabled, 'Function A', 'operations');
  if (!checkA.ok) return {pass: false, message: () => checkA.message};
  const checkB = prepareEffectiveDurations(durationsB, removeOutliersEnabled, 'Function B', 'operations');
  if (!checkB.ok) return {pass: false, message: () => checkB.message};

  const statsA = calcStats(checkA.effective);
  const statsB = calcStats(checkB.effective);
  const tTest = welchTTest(statsA, statsB, confidence);
  const alpha = 1 - confidence;
  const pass = tTest.pValue < alpha;

  // Use pre-outlier-removal counts for throughput (outlier removal cleans per-op stats, not ops completed)
  const actualOpsPerSecondA = (durationsA.length / duration) * 1000;
  const actualOpsPerSecondB = (durationsB.length / duration) * 1000;

  const errorInfoA: ErrorInfo | undefined = errorCountA > 0 ? {errorCount: errorCountA, totalIterations: totalOpsA, allowedRate: allowedErrorRate} : undefined;
  const errorInfoB: ErrorInfo | undefined = errorCountB > 0 ? {errorCount: errorCountB, totalIterations: totalOpsB, allowedRate: allowedErrorRate} : undefined;

  const statsBlock = formatComparativeThroughputStatsBlock({
    statsA, statsB, durationsA: checkA.effective, durationsB: checkB.effective,
    actualOpsPerSecondA, actualOpsPerSecondB,
    totalOpsA: durationsA.length, totalOpsB: durationsB.length,
    duration, tTest, confidence, setupTeardownActive, errorInfoA, errorInfoB,
  });

  const warnings = hasWarningConditions(statsA, undefined, errorInfoA) || hasWarningConditions(statsB, undefined, errorInfoB);
  logDiagnosticsIfNeeded(pass, statsBlock, opts.logDiagnostics, warnings);

  return buildComparativeResult(
    pass, alpha, tTest.pValue, statsBlock,
    'expected Function A NOT to have higher throughput than Function B,\nbut A has statistically significantly higher throughput',
    'expected Function A to have higher throughput than Function B,\nbut no statistically significant difference was found',
  );
}
