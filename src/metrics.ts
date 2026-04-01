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
}

export function calcStats(data: number[]): Stats {
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const median = calcQuantileOnSorted(0.5, sorted);
    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length;
    const stddev = Math.sqrt(variance);
    return {min, max, mean, median, stddev};
}
