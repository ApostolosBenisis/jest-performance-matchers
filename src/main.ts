import {expect} from '@jest/globals';
import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile, calcStats} from "./metrics";

const nowInMillis = () => {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
};

function validateCallback(callback: unknown): void {
    if (typeof callback !== 'function') {
        throw new Error(`jest-performance-matchers: expected value must be a function, received ${typeof callback}`);
    }
}

function validateDuration(expectedDurationInMilliseconds: number): void {
    if (typeof expectedDurationInMilliseconds !== 'number' || !Number.isFinite(expectedDurationInMilliseconds) || expectedDurationInMilliseconds <= 0) {
        throw new Error(`jest-performance-matchers: expected duration must be a positive number, received ${expectedDurationInMilliseconds}`);
    }
}

function validateQuantileOptions(options: { iterations: number, quantile: number, warmup?: number }): void {
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
    warmup?: number
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
    const quantileValue = calcQuantile(quantile, durations);
    return assertDurationQuantile(count, quantile, quantileValue, durations, expectedDurationInMilliseconds);
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
    warmup?: number
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
    const quantileValue = calcQuantile(quantile, durations);
    return assertDurationQuantile(count, quantile, quantileValue, durations, expectedDurationInMilliseconds);
}

function formatDuration(value: number): string {
    return value.toFixed(2);
}

function assertDurationQuantile(iterations: number, quantile: number,  quantileValue: number, durations: number[], expectedDurationInMilliseconds: number) {
    const stats = calcStats(durations);
    const statsLine = `Statistics: min=${formatDuration(stats.min)}, max=${formatDuration(stats.max)}, mean=${formatDuration(stats.mean)}, median=${formatDuration(stats.median)}, stddev=${formatDuration(stats.stddev)}`;

    if (quantileValue <= expectedDurationInMilliseconds) {
        return {
            message: () =>
                // @ts-ignore
                `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be greater than ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\n${statsLine}`,
            pass: true,
        };
    } else {
        return {
            message: () =>
                // @ts-ignore
                `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be less or equal to ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\n${statsLine}`,
            pass: false,
        };
    }
}

function assertDuration(actualDuration: number, expectedDurationInMilliseconds: number) {
    if (actualDuration <= expectedDurationInMilliseconds) {
        return {
            message: () =>
                // @ts-ignore
                `expected function duration ${printReceived(actualDuration)} (ms) to be greater than ${printExpected(expectedDurationInMilliseconds)} (ms)`,
            pass: true,
        };
    } else {
        return {
            message: () =>
                // @ts-ignore
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
                warmup?: number
            }): R;

            toResolveWithin(expectedDurationInMilliseconds: number): Promise<R>;

            toResolveWithinQuantile(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number,
                warmup?: number
            }): Promise<R>;
        }
    }
}