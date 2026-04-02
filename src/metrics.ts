/**
 * Remove statistical outliers using the IQR (Interquartile Range) method.
 * Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are considered outliers and excluded.
 * This is the standard Tukey's fences approach used in box-plot analysis.
 * Returns a new array with outliers removed. Does not mutate the input.
 * For datasets with fewer than 4 elements, returns a copy unchanged (IQR is unreliable).
 */
export function removeOutliers(data: number[]): number[] {
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
    if (!data || !Array.isArray(data) || data.length === 0 || data.some(isNaN)) throw new Error("Data must be an array of numbers and must contain at least one element");
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
    min: number;
    max: number;
    mean: number;
    median: number;
    stddev: number;
    /** Margin of error for a 95% confidence interval (z=1.96 * stddev / sqrt(n)) */
    marginOfError: number;
    /** Relative margin of error as a percentage (marginOfError / mean * 100) */
    relativeMarginOfError: number;
    /** 95% confidence interval [lower, upper] for the mean */
    confidenceInterval: [number, number];
    /** Coefficient of variation (stddev / mean), measures relative dispersion */
    coefficientOfVariation: number;
}

/**
 * Calculate summary statistics for a dataset.
 * Uses population standard deviation (divides by n).
 * Confidence intervals use z=1.96 (95% CI, normal approximation).
 */
export function calcStats(data: number[]): Stats {
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = data.reduce((sum, v) => sum + v, 0) / n;
    const median = calcQuantileOnSorted(0.5, sorted);
    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);
    const marginOfError = 1.96 * stddev / Math.sqrt(n);
    const relativeMarginOfError = mean !== 0 ? (marginOfError / Math.abs(mean)) * 100 : 0;
    const confidenceInterval: [number, number] = [mean - marginOfError, mean + marginOfError];
    const coefficientOfVariation = mean !== 0 ? stddev / Math.abs(mean) : 0;
    return {min, max, mean, median, stddev, marginOfError, relativeMarginOfError, confidenceInterval, coefficientOfVariation};
}
