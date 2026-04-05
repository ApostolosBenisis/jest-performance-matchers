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
// for small samples, because the t-distribution reflects extra uncertainty.
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
    if (n >= 31) return { method: "z", value: 1.96 };
    return { method: "t", value: T_CRITICAL_VALUES_95[n - 1] };
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
            coefficientOfVariation: null, skewness: null, isSmallSample, confidenceMethod: null,
            confidenceCriticalValue: null, warnings
        };
    }

    if (isSmallSample) warnings.push("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");

    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    const stddev = Math.sqrt(variance);
    const { method: confidenceMethod, value: confidenceCriticalValue } = getCriticalValue(n);
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

    return {
        n, min, max, mean, median, stddev, marginOfError, relativeMarginOfError,
        confidenceInterval, coefficientOfVariation, skewness, isSmallSample, confidenceMethod,
        confidenceCriticalValue, warnings
    };
}
