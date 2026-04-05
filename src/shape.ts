export interface ShapeDiagnostics {
    label: "symmetric" | "left-skewed" | "right-skewed" | "bimodal" | "constant" | "insufficient data";
    sparkline: string;
}

function validateData(data: number[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Data must be an array of numbers and must contain at least one element");
    for (const v of data) {
        if (!Number.isFinite(v)) throw new Error("Data must be an array of numbers and must contain at least one element");
    }
}

function generateSparkline(data: number[]): string {
    const blocks = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const binCount = 10;

    if (data.length === 1) return '█';

    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    if (min === max) return '█'.repeat(binCount);

    const bins = new Array(binCount).fill(0);
    const range = max - min;

    for (const v of data) {
        let bin = Math.floor(((v - min) / range) * binCount);
        if (bin === binCount) bin = binCount - 1;
        bins[bin]++;
    }

    const maxCount = Math.max(...bins);
    return bins.map(count => blocks[Math.round((count / maxCount) * 8)]).join('');
}

/**
 * Calculate Sarle's bimodality coefficient.
 * BC > 5/9 (~0.555) suggests bimodality.
 * Caller must ensure n >= 5: at n=3 the denominator (n-2)*(n-3) is zero (division by zero);
 * at n=4 the denominator is non-zero but kurtosis estimates are unreliable at very small n.
 */
function calcBimodalityCoefficient(data: number[], mean: number, stddev: number, skewness: number, n: number): number {
    // Fisher's adjusted excess kurtosis (G2, DeCarlo 1997):
    // G2 = [n(n+1) / ((n-1)(n-2)(n-3))] * SUM[((xi-mean)/s)^4] - 3(n-1)^2 / ((n-2)(n-3))
    const sum4 = data.reduce((sum, v) => sum + ((v - mean) / stddev) ** 4, 0);
    const g2 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum4
             - 3 * ((n - 1) ** 2) / ((n - 2) * (n - 3));
    return (skewness ** 2 + 1) / (g2 + 3 * ((n - 1) ** 2) / ((n - 2) * (n - 3)));
}

/**
 * Calculate distribution shape diagnostics for a dataset.
 * Returns a human-readable shape label and an ASCII sparkline histogram.
 * Shape classification and sparkline are most reliable with n > 100.
 * Smaller samples produce noisier sparklines and less stable shape labels.
 */
export function calcShapeDiagnostics(data: number[], skewness: number | null, stddev: number | null): ShapeDiagnostics {
    validateData(data);

    const sparkline = generateSparkline(data);
    const n = data.length;

    // Rule 1: insufficient data when n < 3 or stddev unavailable
    if (n < 3 || stddev === null) {
        return { label: "insufficient data", sparkline };
    }

    // Rule 2: all identical values
    if (stddev === 0) {
        return { label: "constant", sparkline };
    }

    // Rule 3: skewness unavailable despite n >= 3 and stddev > 0 (defensive guard; unreachable via calcStats)
    if (skewness === null) {
        return { label: "insufficient data", sparkline };
    }

    // Rule 4: bimodality check (requires n >= 5 for kurtosis).
    // Only applied when |skewness| <= 1: heavily skewed distributions inflate BC
    // via the g1^2 numerator term, causing false positives. True bimodal distributions
    // with two roughly equal clusters have near-zero skewness.
    if (n >= 5 && Math.abs(skewness) <= 1) {
        const mean = data.reduce((sum, v) => sum + v, 0) / n;
        const bc = calcBimodalityCoefficient(data, mean, stddev, skewness, n);
        if (bc > 5 / 9) {
            return { label: "bimodal", sparkline };
        }
    }

    // Rules 5-7: skewness-based classification
    if (Math.abs(skewness) <= 0.5) {
        return { label: "symmetric", sparkline };
    }
    if (skewness > 0.5) {
        return { label: "right-skewed", sparkline };
    }
    return { label: "left-skewed", sparkline };
}
