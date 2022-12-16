import {expect} from '@jest/globals';
import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile} from "./metrics";

const nowInMillis = () => {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
};

/**
 * Assert that the synchronous code runs within the given duration.
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 **/
function toCompleteWithin(callback: () => unknown, expectedDurationInMilliseconds: number) {
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
    quantile: number
}) {
    const count = options?.iterations;
    const quantile = options?.quantile;

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
    quantile: number
}) {
    const count = options.iterations;
    const quantile = options?.quantile;

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

function assertDurationQuantile(iterations: number, quantile: number,  quantileValue: number, durations: number[], expectedDurationInMilliseconds: number) {
    if (quantileValue <= expectedDurationInMilliseconds) {
        return {
            message: () =>
                // @ts-ignore
                `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be greater than ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\nDurations:${durations}`,
            pass: true,
        };
    } else {
        return {
            message: () =>
                // @ts-ignore
                `expected that ${quantile}% of the time when running ${iterations} iterations,\nthe function duration to be less or equal to ${printExpected(expectedDurationInMilliseconds)} (ms),\ninstead it was ${printReceived(quantileValue)} (ms)\nDurations:${durations}`,
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
                quantile: number
            }): R;

            toResolveWithin(expectedDurationInMilliseconds: number): R;

            toResolveWithinQuantile(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number
            }): R;
        }
    }
}