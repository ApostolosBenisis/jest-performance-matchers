import {expect} from '@jest/globals';
import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile, calcStats, removeOutliers, Stats} from "./metrics";

const nowInMillis = () => {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
};

function validateCallback(callback: unknown): void {
    if (typeof callback !== 'function') {
        throw new TypeError(`jest-performance-matchers: expected value must be a function, received ${typeof callback}`);
    }
}

function validateDuration(expectedDurationInMilliseconds: number): void {
    if (typeof expectedDurationInMilliseconds !== 'number' || !Number.isFinite(expectedDurationInMilliseconds) || expectedDurationInMilliseconds <= 0) {
        throw new Error(`jest-performance-matchers: expected duration must be a positive number, received ${expectedDurationInMilliseconds}`);
    }
}

function validateQuantileOptions(options: { iterations: number, quantile: number, warmup?: number, outliers?: 'remove' | 'keep' }): void {
    if (!options || typeof options !== 'object') {
        throw new Error('jest-performance-matchers: options must be an object with iterations and quantile');
    }
    if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
        throw new Error(`jest-performance-matchers: iterations must be a positive integer, received ${options.iterations}`);
    }
    if (!Number.isInteger(options.quantile) || options.quantile < 1 || options.quantile > 100) {
        throw new Error(`jest-performance-matchers: quantile must be an integer between 1 and 100, received ${options.quantile}`);
    }
    if (options.warmup !== undefined && (!Number.isInteger(options.warmup) || options.warmup < 0)) {
        throw new Error(`jest-performance-matchers: warmup must be a non-negative integer, received ${options.warmup}`);
    }
    if (options.outliers !== undefined && options.outliers !== 'remove' && options.outliers !== 'keep') {
        throw new Error(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${options.outliers}'`);
    }
}

/**
 * Assert that the synchronous code runs within the given duration.
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 **/
function toCompleteWithin(callback: () => unknown, expectedDurationInMilliseconds: number) {
    validateCallback(callback);
    validateDuration(expectedDurationInMilliseconds);

    const t0 = nowInMillis();
    callback();
    const t1 = nowInMillis();
    const actualDuration = t1 - t0;

    return assertDuration(actualDuration, expectedDurationInMilliseconds);
}

/**
 * Assert that the synchronous code executed for (I) times, runs (Q)% the time within the given duration
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options The numbers of times to execute the callback and the quantile to measure
 */
function toCompleteWithinQuantile(callback: () => unknown, expectedDurationInMilliseconds: number, options: {
    iterations: number,
    quantile: number,
    warmup?: number,
    outliers?: 'remove' | 'keep'
}) {
    validateCallback(callback);
    validateDuration(expectedDurationInMilliseconds);
    validateQuantileOptions(options);

    const count = options.iterations;
    const quantile = options.quantile;
    const warmup = options.warmup ?? 0;

    for (let i = 0; i < warmup; i++) {
        callback();
    }

    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
        const t0 = nowInMillis();
        callback();
        const t1 = nowInMillis();
        durations.push(t1 - t0);
    }
    const effectiveDurations = options.outliers === 'remove' ? removeOutliers(durations) : durations;
    const quantileValue = calcQuantile(quantile, effectiveDurations);
    return assertDurationQuantile(count, quantile, quantileValue, effectiveDurations, expectedDurationInMilliseconds);
}

/**
 * Assert that the asynchronous code resolves within the given duration.
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 */
async function toResolveWithin(promise: () => Promise<unknown>, expectedDurationInMilliseconds: number) {
    validateCallback(promise);
    validateDuration(expectedDurationInMilliseconds);

    const t0 = nowInMillis();
    await promise();
    const t1 = nowInMillis();
    const actualDuration = t1 - t0;
    return assertDuration(actualDuration, expectedDurationInMilliseconds);
}

/**
 * Assert that the asynchronous code executed for (I) times, resolves (Q)% the time within the given duration
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options The numbers of times to execute the callback and the quantile to measure
 */
async function toResolveWithinQuantile(promise: () => Promise<unknown>, expectedDurationInMilliseconds: number, options: {
    iterations: number,
    quantile: number,
    warmup?: number,
    outliers?: 'remove' | 'keep'
}) {
    validateCallback(promise);
    validateDuration(expectedDurationInMilliseconds);
    validateQuantileOptions(options);

    const count = options.iterations;
    const quantile = options.quantile;
    const warmup = options.warmup ?? 0;

    for (let i = 0; i < warmup; i++) {
        await promise();
    }

    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
        const t0 = nowInMillis();
        await promise();
        const t1 = nowInMillis();
        durations.push(t1 - t0);
    }
    const effectiveDurations = options.outliers === 'remove' ? removeOutliers(durations) : durations;
    const quantileValue = calcQuantile(quantile, effectiveDurations);
    return assertDurationQuantile(count, quantile, quantileValue, effectiveDurations, expectedDurationInMilliseconds);
}

function formatStatValue(value: number | null): string {
    return value === null ? 'N/A' : value.toFixed(2);
}

function formatStatsBlock(stats: Stats, durations: number[]): string {
    const ciText = stats.confidenceInterval === null
        ? '95% CI: N/A (insufficient data)'
        : `95% CI: [${stats.confidenceInterval[0].toFixed(2)}, ${stats.confidenceInterval[1].toFixed(2)}]ms`;
    const rmeText = `RME: ${stats.relativeMarginOfError === null ? 'N/A' : stats.relativeMarginOfError.toFixed(2) + '%'}`;
    const cvText = `CV: ${stats.coefficientOfVariation === null ? 'N/A' : stats.coefficientOfVariation.toFixed(2)}`;

    const p25 = calcQuantile(25, durations);
    const p50 = stats.median;
    const p75 = calcQuantile(75, durations);
    const p90 = calcQuantile(90, durations);

    const lines = [
        `Statistics (n=${stats.n}): mean=${formatStatValue(stats.mean)}ms, median=${formatStatValue(stats.median)}ms, stddev=${formatStatValue(stats.stddev)}ms`,
        `${ciText} | ${rmeText} | ${cvText}`,
        `Distribution: min=${formatStatValue(stats.min)}ms | P25=${formatStatValue(p25)}ms | P50=${formatStatValue(p50)}ms | P75=${formatStatValue(p75)}ms | P90=${formatStatValue(p90)}ms | max=${formatStatValue(stats.max)}ms`,
    ];

    if (stats.warnings.length > 0) {
        lines.push('Warnings:');
        for (const warning of stats.warnings) {
            lines.push(`  - ${warning}`);
        }
    }

    return lines.join('\n');
}

function assertDurationQuantile(iterations: number, quantile: number,  quantileValue: number, durations: number[], expectedDurationInMilliseconds: number) {
    const stats = calcStats(durations);
    const statsBlock = formatStatsBlock(stats, durations);

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

function assertDuration(actualDuration: number, expectedDurationInMilliseconds: number) {
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

expect.extend({
    toCompleteWithin,
    toCompleteWithinQuantile,
    toResolveWithin,
    toResolveWithinQuantile
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toCompleteWithin(expectedDurationInMilliseconds: number): R;

            toCompleteWithinQuantile(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number,
                warmup?: number,
                outliers?: 'remove' | 'keep'
            }): R;

            toResolveWithin(expectedDurationInMilliseconds: number): Promise<R>;

            toResolveWithinQuantile(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number,
                warmup?: number,
                outliers?: 'remove' | 'keep'
            }): Promise<R>;
        }
    }
}