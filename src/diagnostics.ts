import {Stats} from "./metrics";

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
    if (rme < 10) return { label: 'GOOD', range: '<10%' };
    if (rme <= 30) return { label: 'FAIR', range: '10-30%' };
    return { label: 'POOR', range: '>30%' };
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
    if (cv < 0.1) return { label: 'GOOD', range: '<0.1' };
    if (cv <= 0.3) return { label: 'FAIR', range: '0.1-0.3' };
    return { label: 'POOR', range: '>0.3' };
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
    if (normalizedMAD < 0.1) return { label: 'GOOD', range: '<0.1' };
    if (normalizedMAD <= 0.3) return { label: 'FAIR', range: '0.1-0.3' };
    return { label: 'POOR', range: '>0.3' };
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
    if (n < 10) return { label: 'POOR', range: '<10' };
    if (n <= 30) return { label: 'FAIR', range: '10-30' };
    return { label: 'GOOD', range: '>30' };
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
export function generateInterpretation(stats: Stats, expectedDuration?: number): string {
    const rme = classifyRME(stats.relativeMarginOfError);
    const cv = classifyCV(stats.coefficientOfVariation);
    const mad = classifyMAD(stats.mad, stats.median);
    const sample = classifySampleAdequacy(stats.n);
    const remedy = 'try increasing iterations, adding warmup, or enabling outlier removal';

    if (stats.confidenceInterval === null) {
        return 'results are unreliable — insufficient data for statistical analysis. Add more iterations to enable confidence intervals';
    }
    if (rme === null) {
        return 'relative error cannot be computed (mean ≈ 0) — RME and CV are unavailable when the mean is zero';
    }

    let message: string;

    if (rme.label === 'POOR') {
        const sampleNote = sample.label !== 'GOOD' ? ` with ${sample.label} sample size` : '';
        message = `mean is not reliable (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)})${sampleNote}. ${remedy}`;
    } else if (rme.label === 'FAIR' && cv!.label === 'POOR') {
        if (mad !== null && mad.label !== 'POOR') {
            message = `mean is approximate and outliers are inflating variance (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}, MAD: ${formatTag(mad)}) — enable outlier removal and increase iterations`;
        } else {
            message = `mean is approximate and most runs vary widely (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}${mad !== null ? `, MAD: ${formatTag(mad)}` : ''}) — increase iterations and investigate environment stability`;
        }
    } else if (rme.label === 'FAIR') {
        message = `results are usable for rough comparison (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}) — increase iterations for tighter estimates`;
    } else if (cv!.label === 'POOR') {
        if (mad !== null && mad.label !== 'POOR') {
            message = `mean is precise but outliers are inflating variance (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}, MAD: ${formatTag(mad)}) — enable outlier removal via { outliers: 'remove' }`;
        } else {
            message = `mean is precise but runs are genuinely inconsistent (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}${mad !== null ? `, MAD: ${formatTag(mad)}` : ''}) — investigate noise sources (GC, I/O, scheduling)`;
        }
    } else if (cv!.label === 'FAIR') {
        message = `results are reliable (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}) — moderate run-to-run variance is expected`;
    } else {
        message = `results are precise and consistent (RME: ${formatTag(rme)}, CV: ${formatTag(cv!)}) — safe for regression detection`;
    }

    if (expectedDuration !== undefined && stats.confidenceInterval !== null) {
        const lower = stats.confidenceInterval[0];
        const upper = stats.confidenceInterval[1];
        if (lower > expectedDuration) {
            message += `. CI range [${lower.toFixed(2)}, ${upper.toFixed(2)}]ms is entirely above your ${expectedDuration}ms threshold — the code is almost certainly too slow`;
        } else if (upper > expectedDuration) {
            message += `. CI upper bound (${upper.toFixed(2)}ms) exceeds your ${expectedDuration}ms threshold — the true mean likely exceeds your budget, consider optimizing the code or raising the threshold`;
        } else {
            message += `. CI range [${lower.toFixed(2)}, ${upper.toFixed(2)}]ms is within your ${expectedDuration}ms threshold — the mean is safely within budget`;
        }
    }

    return message;
}
