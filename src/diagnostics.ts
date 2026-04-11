import {Stats, WelchTTestResult} from "./metrics";

export type TagLabel = 'GOOD' | 'FAIR' | 'POOR';

export interface Tag {
  label: TagLabel;
  range: string;
}

/** Format a classification tag for display: combines the label with its threshold range. */
export function formatTag(tag: Tag): string {
  return `${tag.label} ${tag.range}`;
}

/**
 * Classify the Relative Margin of Error (RME = margin of error / |mean| * 100).
 * RME quantifies how precise the mean estimate is — a lower RME means the mean
 * is more tightly bounded and the confidence interval is narrower.
 *
 * Thresholds follow standard benchmarking practice:
 * - <10%: the mean is precise enough to detect small regressions
 * - 10-30%: the mean is approximate — useful for rough comparisons but not fine-grained detection
 * - >30%: the confidence interval is so wide that the mean is not a reliable point estimate
 */
export function classifyRME(rme: number | null): Tag | null {
  if (rme === null) return null;
  if (rme < 10) return {label: 'GOOD', range: '<10%'};
  if (rme <= 30) return {label: 'FAIR', range: '10-30%'};
  return {label: 'POOR', range: '>30%'};
}

/**
 * Classify the Coefficient of Variation (CV = stddev / |mean|).
 * CV measures run-to-run consistency independent of the absolute timing.
 *
 * Thresholds:
 * - <0.1: very consistent — noise is under 10% of the mean
 * - 0.1-0.3: moderate variance — common for I/O-bound or GC-sensitive code
 * - >0.3: high variance — individual runs differ by more than 30% of the mean,
 *   suggesting external interference (GC, scheduling) or inherently variable code
 */
export function classifyCV(cv: number | null): Tag | null {
  if (cv === null) return null;
  if (cv < 0.1) return {label: 'GOOD', range: '<0.1'};
  if (cv <= 0.3) return {label: 'FAIR', range: '0.1-0.3'};
  return {label: 'POOR', range: '>0.3'};
}

/**
 * Classify MAD-based dispersion (normalized MAD = MAD / |median|).
 * Analogous to CV (stddev / |mean|), but robust to outliers (50% breakdown point).
 *
 * Thresholds mirror CV for conceptual consistency:
 * - <0.1: low dispersion — most runs cluster tightly around the median
 * - 0.1-0.3: moderate dispersion
 * - >0.3: high dispersion — runs are spread widely even by the robust measure
 */
export function classifyMAD(mad: number | null, median: number | null): Tag | null {
  if (mad === null || median === null || median === 0) return null;
  const normalizedMAD = mad / Math.abs(median);
  if (normalizedMAD < 0.1) return {label: 'GOOD', range: '<0.1'};
  if (normalizedMAD <= 0.3) return {label: 'FAIR', range: '0.1-0.3'};
  return {label: 'POOR', range: '>0.3'};
}

/**
 * Classify sample size adequacy for statistical analysis.
 *
 * Thresholds are based on confidence interval reliability:
 * - <10: too few data points — confidence intervals are very wide and unstable
 * - 10-30: usable but imprecise — Student's t-distribution is used (wider intervals)
 * - >30: adequate — the z-distribution applies (CLT kicks in), intervals are stable
 *
 * The 30-sample boundary aligns with the classic rule of thumb for when the
 * Central Limit Theorem provides a reliable normal approximation.
 */
export function classifySampleAdequacy(n: number): Tag {
  if (n < 10) return {label: 'POOR', range: '<10'};
  if (n <= 30) return {label: 'FAIR', range: '10-30'};
  return {label: 'GOOD', range: '>30'};
}

/**
 * Generate a human-readable interpretation of the benchmark results.
 *
 * Considers all three key metrics together:
 * - RME: how precise the mean estimate is (determines if we can trust the average)
 * - CV: how consistent individual runs are (determines if variance is a concern)
 * - CI bounds vs a threshold: whether the confidence interval suggests the true mean exceeds the budget
 *
 * Branches on the RME × CV × MAD matrix:
 * | RME  | CV        | MAD          | Outcome                                           |
 * |------|-----------|--------------|---------------------------------------------------|
 * | POOR | any       | —            | Mean unreliable — need more data                  |
 * | FAIR | POOR      | GOOD/FAIR    | Approximate mean; outliers inflating variance — enable outlier removal + increase iterations |
 * | FAIR | POOR      | POOR/null    | Approximate mean; runs genuinely inconsistent — increase iterations + investigate environment |
 * | FAIR | FAIR/GOOD | —            | Approximate mean, acceptable variance              |
 * | GOOD | POOR      | GOOD/FAIR    | Precise mean; outliers inflating variance — enable `outliers: 'remove'` |
 * | GOOD | POOR      | POOR/null    | Precise mean but genuinely inconsistent runs — investigate noise sources |
 * | GOOD | FAIR      | —            | Reliable — moderate variance is expected            |
 * | GOOD | GOOD      | —            | Precise and consistent — safe for regression detection |
 *
 * When expectedDuration is provided, also checks if the CI upper bound
 * exceeds the user's threshold — flagging a potential budget overrun even
 * when the quantile assertion passes.
 */
function interpretPoorCV(rmeTag: Tag, cvTag: Tag, madTag: Tag | null, context: 'approximate' | 'precise'): string {
  const madSuffix = madTag === null ? '' : `, MAD: ${formatTag(madTag)}`;
  if (madTag !== null && madTag.label !== 'POOR') {
    const action = context === 'approximate'
      ? 'enable outlier removal and increase iterations'
      : "enable outlier removal via { outliers: 'remove' }";
    return `mean is ${context === 'approximate' ? 'approximate and' : 'precise but'} outliers are inflating variance (RME: ${formatTag(rmeTag)}, CV: ${formatTag(cvTag)}, MAD: ${formatTag(madTag)}) — ${action}`;
  }
  const action = context === 'approximate'
    ? 'increase iterations and investigate environment stability'
    : 'investigate noise sources (GC, I/O, scheduling)';
  return `mean is ${context === 'approximate' ? 'approximate and' : 'precise but'} ${context === 'approximate' ? 'most runs vary widely' : 'runs are genuinely inconsistent'} (RME: ${formatTag(rmeTag)}, CV: ${formatTag(cvTag)}${madSuffix}) — ${action}`;
}

function classifyReliability(rme: Tag, cv: Tag, mad: Tag | null, sample: Tag): string {
  const remedy = 'try increasing iterations, adding warmup, or enabling outlier removal';

  if (rme.label === 'POOR') {
    const sampleNote = sample.label === 'GOOD' ? '' : ` with ${sample.label} sample size`;
    return `mean is not reliable (RME: ${formatTag(rme)}, CV: ${formatTag(cv)})${sampleNote}. ${remedy}`;
  }
  if (rme.label === 'FAIR' && cv.label === 'POOR') {
    return interpretPoorCV(rme, cv, mad, 'approximate');
  }
  if (rme.label === 'FAIR') {
    return `results are usable for rough comparison (RME: ${formatTag(rme)}, CV: ${formatTag(cv)}) — increase iterations for tighter estimates`;
  }
  if (cv.label === 'POOR') {
    return interpretPoorCV(rme, cv, mad, 'precise');
  }
  if (cv.label === 'FAIR') {
    return `results are reliable (RME: ${formatTag(rme)}, CV: ${formatTag(cv)}) — moderate run-to-run variance is expected`;
  }
  return `results are precise and consistent (RME: ${formatTag(rme)}, CV: ${formatTag(cv)}) — safe for regression detection`;
}

function appendCICheck(message: string, ci: [number, number], expectedDuration: number): string {
  const [lower, upper] = ci;
  if (lower > expectedDuration) {
    return message + `. CI range [${lower.toFixed(2)}, ${upper.toFixed(2)}]ms is entirely above your ${expectedDuration}ms threshold — the code is almost certainly too slow`;
  }
  if (upper > expectedDuration) {
    return message + `. CI upper bound (${upper.toFixed(2)}ms) exceeds your ${expectedDuration}ms threshold — the true mean likely exceeds your budget, consider optimizing the code or raising the threshold`;
  }
  return message + `. CI range [${lower.toFixed(2)}, ${upper.toFixed(2)}]ms is within your ${expectedDuration}ms threshold — the mean is safely within budget`;
}

export function generateInterpretation(stats: Stats, expectedDuration?: number, errorInfo?: {
  errorCount: number;
  totalIterations: number;
  allowedRate: number
}): string {
  const rme = classifyRME(stats.relativeMarginOfError);
  const cv = classifyCV(stats.coefficientOfVariation);
  const mad = classifyMAD(stats.mad, stats.median);
  const sample = classifySampleAdequacy(stats.n);

  if (stats.confidenceInterval === null) {
    return 'results are unreliable — insufficient data for statistical analysis. Add more iterations to enable confidence intervals';
  }
  if (rme === null) {
    return 'relative error cannot be computed (mean ≈ 0) — RME and CV are unavailable when the mean is zero';
  }

  // cv is guaranteed non-null when rme is non-null (both derive from mean !== 0)
  /* istanbul ignore next -- defensive guard: cv is always non-null when rme is non-null */
  if (cv === null) {
    return 'relative error cannot be computed (mean ≈ 0) — RME and CV are unavailable when the mean is zero';
  }
  let message = classifyReliability(rme, cv, mad, sample);

  if (expectedDuration !== undefined && stats.confidenceInterval !== null) {
    message = appendCICheck(message, stats.confidenceInterval, expectedDuration);
  }

  if (errorInfo !== undefined && errorInfo.errorCount > 0) {
    message += `. Note: ${errorInfo.errorCount} of ${errorInfo.totalIterations} iterations were excluded due to errors — stats reflect successful runs only`;
  }

  return message;
}

/**
 * Generate a human-readable interpretation of a comparative benchmark (A vs B).
 *
 * Considers:
 * 1. Data reliability (RME of both datasets)
 * 2. Statistical significance (p-value vs alpha)
 * 3. Practical significance (percentage difference)
 * 4. CI overlap between the two functions
 */
export function generateComparisonInterpretation(
  statsA: Stats, statsB: Stats, tTest: WelchTTestResult, confidence: number
): string {
  const rmeA = classifyRME(statsA.relativeMarginOfError);
  const rmeB = classifyRME(statsB.relativeMarginOfError);

  const reliabilityCheck = checkComparisonReliability(rmeA, rmeB);
  if (reliabilityCheck !== null) return reliabilityCheck;

  const alpha = 1 - confidence;
  const meanB = statsB.mean as number; // guaranteed non-null: callers ensure n >= 2
  const absDiff = Math.abs(tTest.meanDifference);
  const pctDiff = meanB === 0 ? 0 : (absDiff / Math.abs(meanB)) * 100;

  if (tTest.pValue < alpha) {
    return formatSignificantResult(tTest, absDiff, pctDiff, alpha);
  }
  return formatNotSignificantResult(tTest, absDiff, pctDiff, alpha);
}

function checkComparisonReliability(rmeA: Tag | null, rmeB: Tag | null): string | null {
  const unreliableA = rmeA !== null && rmeA.label === 'POOR';
  const unreliableB = rmeB !== null && rmeB.label === 'POOR';
  if (unreliableA || unreliableB) {
    let which: string;
    if (unreliableA && unreliableB) which = 'both functions have';
    else if (unreliableA) which = 'Function A has';
    else which = 'Function B has';
    return `comparison is unreliable — ${which} POOR RME (wide confidence intervals). Increase iterations or add warmup before drawing conclusions`;
  }
  if (rmeA === null || rmeB === null) {
    return 'comparison reliability cannot be assessed — one or both functions have near-zero mean timing. Results may not be meaningful';
  }
  return null;
}

function formatSignificantResult(tTest: WelchTTestResult, absDiff: number, pctDiff: number, alpha: number): string {
  let practical = '';
  if (pctDiff < 1) {
    practical = '. However, the difference is less than 1% — statistically significant but may be practically negligible';
  } else if (pctDiff < 5) {
    practical = '. The difference is modest (< 5%) — consider whether this is practically meaningful for your use case';
  }
  return `Function A is statistically significantly faster than Function B (p=${formatPValue(tTest.pValue)} < α=${alpha.toFixed(2)}), with a mean difference of ${absDiff.toFixed(2)}ms (${pctDiff.toFixed(1)}%)${practical}`;
}

function formatNotSignificantResult(tTest: WelchTTestResult, absDiff: number, pctDiff: number, alpha: number): string {
  if (tTest.meanDifference < 0) {
    return `no statistically significant evidence that Function A is faster than Function B (p=${formatPValue(tTest.pValue)} >= α=${alpha.toFixed(2)}). Function A trends faster by ${absDiff.toFixed(2)}ms (${pctDiff.toFixed(1)}%) but the difference could be due to chance — increase iterations for more statistical power`;
  }
  if (tTest.meanDifference === 0) {
    return `no statistically significant difference — both functions have identical mean timing (p=${formatPValue(tTest.pValue)} >= α=${alpha.toFixed(2)})`;
  }
  return `Function A appears to be slower than Function B by ${absDiff.toFixed(2)}ms (${pctDiff.toFixed(1)}%), not faster (p=${formatPValue(tTest.pValue)} >= α=${alpha.toFixed(2)})`;
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return '<0.0001';
  return p.toFixed(4);
}
