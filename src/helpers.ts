import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile, calcStats, removeOutliers, Stats} from "./metrics";
import {calcShapeDiagnostics} from "./shape";
import {
  classifyRME,
  classifyCV,
  classifyMAD,
  classifySampleAdequacy,
  generateInterpretation,
  formatTag
} from "./diagnostics";

export interface ErrorInfo {
  errorCount: number;
  totalIterations: number;
  allowedRate: number;
}

export function formatStatValue(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

export function formatStatsBlock(stats: Stats, durations: number[], expectedDuration?: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo): string {
  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);

  const ciText = stats.confidenceInterval === null
    ? 'Confidence Interval (CI): N/A (insufficient data)'
    : `Confidence Interval (CI): 95% [${stats.confidenceInterval[0].toFixed(2)}, ${stats.confidenceInterval[1].toFixed(2)}]ms`;
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
  const madText = stats.mad === null
    ? 'Median Absolute Deviation (MAD): N/A'
    : `Median Absolute Deviation (MAD): ${stats.mad.toFixed(2)}ms${madTag !== null ? ` [${formatTag(madTag)}]` : ''}`;

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

export function processQuantileResults(
  durations: number[], count: number, quantile: number, errorCount: number, allowedErrorRate: number,
  expectedDurationInMilliseconds: number, setupTeardownActive: boolean, removeOutliersEnabled: boolean
): { message: () => string; pass: boolean } {
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
