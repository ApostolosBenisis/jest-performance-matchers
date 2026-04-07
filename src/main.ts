import {expect} from '@jest/globals';
import {printReceived, printExpected} from 'jest-matcher-utils';
import {calcQuantile, calcStats, removeOutliers, Stats} from "./metrics";
import {calcShapeDiagnostics} from "./shape";
import {classifyRME, classifyCV, classifyMAD, classifySampleAdequacy, generateInterpretation, formatTag} from "./diagnostics";

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

function validateSetupTeardown(options?: { setup?: unknown, teardown?: unknown, setupEach?: unknown, teardownEach?: unknown }): void {
    if (options?.setup !== undefined && typeof options.setup !== 'function') {
        throw new Error(`jest-performance-matchers: setup must be a function if provided, received ${typeof options.setup}`);
    }
    if (options?.teardown !== undefined && typeof options.teardown !== 'function') {
        throw new Error(`jest-performance-matchers: teardown must be a function if provided, received ${typeof options.teardown}`);
    }
    if (options?.setupEach !== undefined && typeof options.setupEach !== 'function') {
        throw new Error(`jest-performance-matchers: setupEach must be a function if provided, received ${typeof options.setupEach}`);
    }
    if (options?.teardownEach !== undefined && typeof options.teardownEach !== 'function') {
        throw new Error(`jest-performance-matchers: teardownEach must be a function if provided, received ${typeof options.teardownEach}`);
    }
}

function validateQuantileOptions(options: { iterations: number, quantile: number, warmup?: number, outliers?: 'remove' | 'keep', setup?: unknown, teardown?: unknown, setupEach?: unknown, teardownEach?: unknown, allowedErrorRate?: number }): void {
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
    if (options.allowedErrorRate !== undefined) {
        if (typeof options.allowedErrorRate !== 'number' || !Number.isFinite(options.allowedErrorRate) || options.allowedErrorRate < 0 || options.allowedErrorRate > 1) {
            throw new Error(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${options.allowedErrorRate}`);
        }
    }
    validateSetupTeardown(options);
}

/**
 * Assert that the synchronous code runs within the given duration.
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Optional setup/teardown hooks — setup runs before timing, teardown after
 **/
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
function toCompleteWithin(callback: (state: any) => unknown, expectedDurationInMilliseconds: number, options?: {
    setup?: () => unknown,
    teardown?: (state: unknown) => void,
}) {
    validateCallback(callback);
    validateDuration(expectedDurationInMilliseconds);
    validateSetupTeardown(options);

    const setupResult = options?.setup ? options.setup() : undefined;
    let actualDuration: number;
    try {
        const t0 = nowInMillis();
        callback(setupResult);
        const t1 = nowInMillis();
        actualDuration = t1 - t0;
    } finally {
        if (options?.teardown) options.teardown(setupResult);
    }

    return assertDuration(actualDuration, expectedDurationInMilliseconds);
}

/**
 * Assert that the synchronous code executed for (I) times, runs (Q)% the time within the given duration
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
function toCompleteWithinQuantile(callback: (...args: any[]) => unknown, expectedDurationInMilliseconds: number, options: {
    iterations: number,
    quantile: number,
    warmup?: number,
    outliers?: 'remove' | 'keep',
    setup?: () => unknown,
    teardown?: (suiteState: unknown) => void,
    setupEach?: (suiteState: unknown) => unknown,
    teardownEach?: (suiteState: unknown, iterState: unknown) => void,
    allowedErrorRate?: number,
}) {
    validateCallback(callback);
    validateDuration(expectedDurationInMilliseconds);
    validateQuantileOptions(options);

    const count = options.iterations;
    const quantile = options.quantile;
    const warmup = options.warmup ?? 0;
    const { setup, teardown, setupEach, teardownEach } = options;

    const suiteState = setup ? setup() : undefined;

    const allowedErrorRate = options.allowedErrorRate ?? 0;

    try {
        for (let i = 0; i < warmup; i++) {
            const iterState = setupEach ? setupEach(suiteState) : undefined;
            try {
                callback(suiteState, iterState);
            } finally {
                if (teardownEach) teardownEach(suiteState, iterState);
            }
        }

        const durations: number[] = [];
        let errorCount = 0;
        for (let i = 0; i < count; i++) {
            const iterState = setupEach ? setupEach(suiteState) : undefined;
            try {
                const t0 = nowInMillis();
                callback(suiteState, iterState);
                const t1 = nowInMillis();
                durations.push(t1 - t0);
            } catch (e) {
                if (allowedErrorRate === 0) throw e;
                errorCount++;
            } finally {
                if (teardownEach) teardownEach(suiteState, iterState);
            }
        }

        const setupTeardownActive = !!(setup || teardown || setupEach || teardownEach);
        return processQuantileResults(durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, options.outliers === 'remove');
    } finally {
        if (teardown) teardown(suiteState);
    }
}

/**
 * Assert that the asynchronous code resolves within the given duration.
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Optional setup/teardown hooks — setup runs before timing, teardown after
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
async function toResolveWithin(promise: (state: any) => Promise<unknown>, expectedDurationInMilliseconds: number, options?: {
    setup?: () => unknown | Promise<unknown>,
    teardown?: (state: unknown) => void | Promise<void>,
}) {
    validateCallback(promise);
    validateDuration(expectedDurationInMilliseconds);
    validateSetupTeardown(options);

    const setupResult = options?.setup ? await options.setup() : undefined;
    let actualDuration: number;
    try {
        const t0 = nowInMillis();
        await promise(setupResult);
        const t1 = nowInMillis();
        actualDuration = t1 - t0;
    } finally {
        if (options?.teardown) await options.teardown(setupResult);
    }
    return assertDuration(actualDuration, expectedDurationInMilliseconds);
}

/**
 * Assert that the asynchronous code executed for (I) times, resolves (Q)% the time within the given duration
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
async function toResolveWithinQuantile(promise: (...args: any[]) => Promise<unknown>, expectedDurationInMilliseconds: number, options: {
    iterations: number,
    quantile: number,
    warmup?: number,
    outliers?: 'remove' | 'keep',
    setup?: () => unknown | Promise<unknown>,
    teardown?: (suiteState: unknown) => void | Promise<void>,
    setupEach?: (suiteState: unknown) => unknown | Promise<unknown>,
    teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
    allowedErrorRate?: number,
}) {
    validateCallback(promise);
    validateDuration(expectedDurationInMilliseconds);
    validateQuantileOptions(options);

    const count = options.iterations;
    const quantile = options.quantile;
    const warmup = options.warmup ?? 0;
    const { setup, teardown, setupEach, teardownEach } = options;

    const suiteState = setup ? await setup() : undefined;
    const allowedErrorRate = options.allowedErrorRate ?? 0;

    try {
        for (let i = 0; i < warmup; i++) {
            const iterState = setupEach ? await setupEach(suiteState) : undefined;
            try {
                await promise(suiteState, iterState);
            } finally {
                if (teardownEach) await teardownEach(suiteState, iterState);
            }
        }

        const durations: number[] = [];
        let errorCount = 0;
        for (let i = 0; i < count; i++) {
            const iterState = setupEach ? await setupEach(suiteState) : undefined;
            try {
                const t0 = nowInMillis();
                await promise(suiteState, iterState);
                const t1 = nowInMillis();
                durations.push(t1 - t0);
            } catch (e) {
                if (allowedErrorRate === 0) throw e;
                errorCount++;
            } finally {
                if (teardownEach) await teardownEach(suiteState, iterState);
            }
        }

        const setupTeardownActive = !!(setup || teardown || setupEach || teardownEach);
        return processQuantileResults(durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, options.outliers === 'remove');
    } finally {
        if (teardown) await teardown(suiteState);
    }
}

function processQuantileResults(
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
    const errorInfo: ErrorInfo | undefined = errorCount > 0 ? { errorCount, totalIterations: count, allowedRate: allowedErrorRate } : undefined;
    return assertDurationQuantile(count, quantile, quantileValue, effectiveDurations, expectedDurationInMilliseconds, setupTeardownActive, errorInfo);
}

function formatStatValue(value: number | null): string {
    return value === null ? 'N/A' : value.toFixed(2);
}

interface ErrorInfo {
    errorCount: number;
    totalIterations: number;
    allowedRate: number;
}

function formatStatsBlock(stats: Stats, durations: number[], expectedDuration?: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo): string {
    const rmeTag = classifyRME(stats.relativeMarginOfError);
    const cvTag = classifyCV(stats.coefficientOfVariation);

    const ciText = stats.confidenceInterval === null
        ? 'Confidence Interval (CI): N/A (insufficient data)'
        : `Confidence Interval (CI): 95% [${stats.confidenceInterval[0].toFixed(2)}, ${stats.confidenceInterval[1].toFixed(2)}]ms`;
    const rmeText = stats.relativeMarginOfError === null
        ? 'Relative Margin of Error (RME): N/A'
        : `Relative Margin of Error (RME): ${stats.relativeMarginOfError.toFixed(2)}% [${formatTag(rmeTag!)}]`;
    const cvText = stats.coefficientOfVariation === null
        ? 'Coefficient of Variation (CV): N/A'
        : `Coefficient of Variation (CV): ${stats.coefficientOfVariation.toFixed(2)} [${formatTag(cvTag!)}]`;

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

function assertDurationQuantile(iterations: number, quantile: number,  quantileValue: number, durations: number[], expectedDurationInMilliseconds: number, setupTeardownActive?: boolean, errorInfo?: ErrorInfo) {
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
            toCompleteWithin<T = void>(expectedDurationInMilliseconds: number, options?: {
                setup?: () => T,
                teardown?: (state: T) => void,
            }): R;

            toCompleteWithinQuantile<T = void, U = void>(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number,
                warmup?: number,
                outliers?: 'remove' | 'keep',
                setup?: () => T,
                teardown?: (suiteState: T) => void,
                setupEach?: (suiteState: T) => U,
                teardownEach?: (suiteState: T, iterState: U) => void,
                allowedErrorRate?: number,
            }): R;

            toResolveWithin<T = void>(expectedDurationInMilliseconds: number, options?: {
                setup?: () => T | Promise<T>,
                teardown?: (state: T) => void | Promise<void>,
            }): Promise<R>;

            toResolveWithinQuantile<T = void, U = void>(expectedDurationInMilliseconds: number, options: {
                iterations: number,
                quantile: number,
                warmup?: number,
                outliers?: 'remove' | 'keep',
                setup?: () => T | Promise<T>,
                teardown?: (suiteState: T) => void | Promise<void>,
                setupEach?: (suiteState: T) => U | Promise<U>,
                teardownEach?: (suiteState: T, iterState: U) => void | Promise<void>,
                allowedErrorRate?: number,
            }): Promise<R>;
        }
    }
}