import '../src/main';
import * as metrics from '../src/metrics';
import {calcShapeDiagnostics} from '../src/shape';
import {classifyRME, classifyCV, classifySampleAdequacy, generateInterpretation, formatTag} from '../src/diagnostics';
import {printExpected, printReceived} from "jest-matcher-utils";


function mockFunctionProcessTime(milliseconds: number) {
    mockFunctionProcessTimes([milliseconds]);
}

function buildStatsBlock(durations: number[], expectedDuration?: number): string {
    const stats = metrics.calcStats(durations);
    const fmt = (v: number | null) => v !== null ? v.toFixed(2) : 'N/A';

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

    const p25 = metrics.calcQuantile(25, durations);
    const p50 = stats.median;
    const p75 = metrics.calcQuantile(75, durations);
    const p90 = metrics.calcQuantile(90, durations);

    const shapeDiag = calcShapeDiagnostics(durations, stats.skewness, stats.stddev);
    const skewnessText = stats.skewness === null ? 'N/A' : stats.skewness.toFixed(2);

    const lines = [
        `Statistics (n=${stats.n}): mean=${fmt(stats.mean)}ms, median=${fmt(stats.median)}ms, stddev=${fmt(stats.stddev)}ms`,
        ciText,
        rmeText,
        cvText,
        `Distribution: min=${fmt(stats.min)}ms | P25=${fmt(p25)}ms | P50=${fmt(p50)}ms | P75=${fmt(p75)}ms | P90=${fmt(p90)}ms | max=${fmt(stats.max)}ms`,
        `Shape: ${shapeDiag.label} (skewness=${skewnessText}) | ${shapeDiag.sparkline}`,
        `Sample adequacy: ${formatTag(classifySampleAdequacy(stats.n))} (n=${stats.n})`,
        `Interpretation: ${generateInterpretation(stats, expectedDuration)}`,
    ];

    if (stats.warnings.length > 0) {
        lines.push('Warnings:');
        for (const warning of stats.warnings) {
            lines.push(`  - ${warning}`);
        }
    }

    return lines.join('\n');
}

function mockFunctionProcessTimes(milliseconds: number[]) {
    let calledTimes = 0;
    jest.spyOn(process, "hrtime").mockImplementation(() => {
        calledTimes++;
        if (calledTimes % 2 !== 0) {
            return [1, 0];
        }
        return [1, 1000000 * milliseconds[calledTimes / 2 - 1]];
    });
}


describe("Test jest expect.toCompleteWithin assertion", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    })

    test("Should pass the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will complete in (T) milliseconds
        // THEN expect success
        expect(() => undefined).toCompleteWithin(T);
    });

    test("Should fail the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will complete in T - 1 milliseconds
        // THEN expect to fail
        expect(() => {
            expect(() => undefined).toCompleteWithin(T - 1);
        }).toThrowError(`expected function duration ${printReceived(T)} (ms) to be less or equal to ${printExpected(T - 1)} (ms)`);
    });

    test("Should not to pass the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will *not* complete in (T) milliseconds
        // THEN expect to fail
        expect(() => {
            expect(() => undefined).not.toCompleteWithin(T);
        }).toThrowError(`expected function duration ${printReceived(T)} (ms) to be greater than ${printExpected(T)} (ms)`);
    });

    test("Should call the callback", () => {
        // GIVEN a function takes (T) milliseconds to complete
        const T = 10;
        mockFunctionProcessTime(T);
        const mockFn = jest.fn();

        // WHEN asserting toCompleteWithin
        expect(mockFn).toCompleteWithin(T);
        // THEN expect the function to have been called once
        expect(mockFn).toBeCalledTimes(1);
    });
});

describe("Test jest expect.toResolveWithin assertion", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    })

    test("Should pass the assertion (async)", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will resolve in (T) milliseconds
        // THEN expect success
        await expect(async () => await Promise.resolve()).toResolveWithin(T);
    });

    test("Should pass the assertion (promise)", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will resolve in (T) milliseconds
        // THEN expect success
        await expect(() => Promise.resolve()).toResolveWithin(T);
    });

    test("Should fail the assertion", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will resolve in T - 1 milliseconds
        // THEN expect to fail
        await expect(async () => {
            await expect(async () => await Promise.resolve()).toResolveWithin(T - 1);
        }).rejects.toThrowError(`expected function duration ${printReceived(T)} (ms) to be less or equal to ${printExpected(T - 1)} (ms)`);
    });

    test("Should not to pass the assertion", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will not resolve in (T) milliseconds
        // THEN expect to fail
        await expect(async () => {
            await expect(async () => await Promise.resolve()).not.toResolveWithin(T);
        }).rejects.toThrowError(`expected function duration ${printReceived(T)} (ms) to be greater than ${printExpected(T)} (ms)`);
    });

    test("Should fail the assertion if the promise is rejected", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);

        // WHEN asserting that it will not resolve in (T) milliseconds
        // AND the promise rejects
        // THEN expect to fail
        await expect(async () => {
            await expect(async () => Promise.reject("Rejected for some reason")).toResolveWithin(T);
        }).rejects.toEqual("Rejected for some reason");
    });

    test("Should call the callback", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve
        const T = 10;
        mockFunctionProcessTime(T);
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting toResolveWithin
        await expect(mockFn).toResolveWithin(T);
        // THEN expect the promise to have been called once
        expect(mockFn).toBeCalledTimes(1);
    });
});

describe("Test jest expect.toCompleteWithinQuantile assertion", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    })

    test("Should pass the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete each of the (I) times it will be called
        const T = 10;
        const I = 5
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the function will complete in (T) milliseconds
        const Q = 1
        // THEN expect success
        expect(() => undefined).toCompleteWithinQuantile(T, {iterations: I, quantile: Q});
    });

    test("Should fail the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete each of the (I) times it will be called
        const T = 10;
        const I = 5;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the function will complete in (T) - 1 milliseconds
        // THEN expect to fail
        const Q = 1;
        const expectedStatsBlock = buildStatsBlock(T_Array, T - 1);

        expect(() => {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: I, quantile: Q});
        }).toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be less or equal to ${printExpected(T - 1)} (ms),\ninstead it was ${printReceived(T)} (ms)\n\n${expectedStatsBlock}`);
    });

    test("Should show N/A for stddev when only one iteration is run", () => {
        // GIVEN a function takes (T) milliseconds for a single iteration
        const T = 10;
        mockFunctionProcessTimes([T]);

        // WHEN asserting with iterations=1 and it fails
        // THEN the stats block should show N/A for stddev (n=1 cannot compute stddev)
        const expectedStatsBlock = buildStatsBlock([T], T - 1);
        expect(expectedStatsBlock).toContain("stddev=N/A");

        expect(() => {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: 1, quantile: 1});
        }).toThrowError(expectedStatsBlock);
    });

    test("Should not to pass the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete each of the (I) times it will be called
        const T = 10;
        const I = 5;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the function will complete in (T) milliseconds
        // THEN expect to fail
        const Q = 1;
        const expectedStatsBlock = buildStatsBlock(T_Array, T);

        expect(() => {
            expect(() => undefined).not.toCompleteWithinQuantile(T, {iterations: I, quantile: Q});
        }).toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be greater than ${printExpected(T)} (ms),\ninstead it was ${printReceived(T)} (ms)\n\n${expectedStatsBlock}`);
    });

    test("Should base calculations of the the expected quantile based on the iterations arguments", () => {
        // GIVEN a function takes (T) milliseconds to complete each of the (I) times it will be called
        const T = 10;
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);
        const mockFn = jest.fn();

        // WHEN asserting toCompleteWithinQuantile(T,I,Q)
        const Q = 1;
        jest.spyOn(metrics, 'calcQuantile')
        // THEN expect the function to have been called (I) times
        expect(mockFn).toCompleteWithinQuantile(T, {iterations: I, quantile: Q});
        expect(mockFn).toBeCalledTimes(I);
        // AND quantile arguments are (Q), function durations
        expect(metrics.calcQuantile).toHaveBeenCalledWith(Q, T_Array);
    });

    test("Should run warmup iterations before measured iterations", () => {
        // GIVEN a function with warmup and measured iterations
        const T = 10;
        const I = 3;
        const W = 2;
        // AND hrtime is mocked for warmup (W * 2 calls) + measured (I * 2 calls)
        mockFunctionProcessTimes(Array(W + I).fill(T));
        const mockFn = jest.fn();

        // WHEN asserting with warmup
        expect(mockFn).toCompleteWithinQuantile(T, {iterations: I, quantile: 1, warmup: W});

        // THEN expect the callback to have been called warmup + iterations times
        expect(mockFn).toBeCalledTimes(W + I);
    });

    test("Should only include measured iterations in durations when warmup is used", () => {
        // GIVEN a function with warmup iterations
        const T = 10;
        const I = 3;
        const W = 2;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(Array(W + I).fill(T));
        const mockFn = jest.fn();

        // WHEN asserting with warmup
        jest.spyOn(metrics, 'calcQuantile');
        expect(mockFn).toCompleteWithinQuantile(T, {iterations: I, quantile: 1, warmup: W});

        // THEN only measured iterations are passed to calcQuantile
        expect(metrics.calcQuantile).toHaveBeenCalledWith(1, T_Array);
    });

    test("Should remove outliers when outliers option is 'remove'", () => {
        // GIVEN a function with some outlier durations
        const I = 6;
        const durations = [10, 11, 12, 10, 11, 100];
        mockFunctionProcessTimes(durations);
        const mockFn = jest.fn();

        // WHEN asserting with outliers: 'remove'
        jest.spyOn(metrics, 'removeOutliers');
        expect(mockFn).toCompleteWithinQuantile(15, {iterations: I, quantile: 95, outliers: 'remove'});

        // THEN removeOutliers should be called with the durations
        expect(metrics.removeOutliers).toHaveBeenCalledWith(durations);
    });

    test("Should keep outliers by default", () => {
        // GIVEN a function with some outlier durations
        const I = 5;
        const T_Array = Array(I).fill(10);
        mockFunctionProcessTimes(T_Array);
        const mockFn = jest.fn();

        // WHEN asserting without outliers option
        jest.spyOn(metrics, 'removeOutliers');
        expect(mockFn).toCompleteWithinQuantile(15, {iterations: I, quantile: 95});

        // THEN removeOutliers should not be called
        expect(metrics.removeOutliers).not.toHaveBeenCalled();
    });

    test("Should show CI unavailable and warnings for n=1", () => {
        // GIVEN a function that runs a single iteration
        const T = 10;
        mockFunctionProcessTimes([T]);

        // WHEN asserting with iterations=1 and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: 1, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should indicate CI is unavailable
        expect(errorMessage).toContain('Confidence Interval (CI): N/A (insufficient data)');
        // AND warnings should be present
        expect(errorMessage).toContain('Warnings:');
        expect(errorMessage).toContain('Single data point: standard deviation and confidence interval cannot be computed');
    });

    test("Should show warnings for small sample size", () => {
        // GIVEN a function that runs for a small sample (n=5)
        const T = 10;
        const I = 5;
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should contain the small sample warning
        expect(errorMessage).toContain('Warnings:');
        expect(errorMessage).toContain('Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values');
    });

    test("Should not show warnings for large sample size (n>=31)", () => {
        // GIVEN a function that runs for a large sample (n=31)
        const T = 10;
        const I = 31;
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should not contain warnings
        expect(errorMessage).not.toContain('Warnings:');
    });

    test("Should show correct distribution percentiles", () => {
        // GIVEN a function with varying durations
        const durations = [5, 10, 15, 20, 25];
        const I = durations.length;
        mockFunctionProcessTimes(durations);

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the distribution line should contain the correct percentile values
        const p25 = metrics.calcQuantile(25, durations).toFixed(2);
        const p50 = metrics.calcQuantile(50, durations).toFixed(2);
        const p75 = metrics.calcQuantile(75, durations).toFixed(2);
        const p90 = metrics.calcQuantile(90, durations).toFixed(2);
        expect(errorMessage).toContain(`P25=${p25}ms`);
        expect(errorMessage).toContain(`P50=${p50}ms`);
        expect(errorMessage).toContain(`P75=${p75}ms`);
        expect(errorMessage).toContain(`P90=${p90}ms`);
    });

    test("Should show N/A for RME and CV when mean is zero", () => {
        // GIVEN durations that produce a zero mean (not possible with real durations,
        // so we test indirectly by verifying the formatStatsBlock logic via calcStats)
        // When all durations are identical, stddev=0 and CV=0, but mean is non-zero.
        // For mean=0 we need to verify the branch via the stats output.
        // We test this by checking the stats block output when calcStats would produce null RME/CV.
        const T = 10;
        mockFunctionProcessTimes([T]);

        // WHEN asserting with iterations=1 (stddev=null, so CV=null, and CI=null so RME=null)
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: 1, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN RME and CV should show N/A
        expect(errorMessage).toContain('Relative Margin of Error (RME): N/A');
        expect(errorMessage).toContain('Coefficient of Variation (CV): N/A');
    });

    test("Should show Shape line in failure message", () => {
        // GIVEN a function with varying durations
        const durations = [5, 10, 15, 20, 25];
        const I = durations.length;
        mockFunctionProcessTimes(durations);

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should contain the Shape line with label and sparkline
        // eslint-disable-next-line no-console
        console.log(`\n--- Failure message (symmetric, n=${I}) ---\n${errorMessage}\n`);
        expect(errorMessage).toContain('Shape:');
        expect(errorMessage).toContain('skewness=');
    });

    test("Should show 'insufficient data' shape for n=1", () => {
        // GIVEN a function with a single iteration
        const T = 10;
        mockFunctionProcessTimes([T]);

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: 1, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the shape should be 'insufficient data'
        // eslint-disable-next-line no-console
        console.log(`\n--- Failure message (insufficient data, n=1) ---\n${errorMessage}\n`);
        expect(errorMessage).toContain('Shape: insufficient data (skewness=N/A)');
    });

    test("Should show 'constant' shape for identical durations (n >= 3)", () => {
        // GIVEN a function with identical durations
        const T = 10;
        const I = 5;
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the shape should be 'constant' since all values are the same
        // eslint-disable-next-line no-console
        console.log(`\n--- Failure message (constant, n=${I}) ---\n${errorMessage}\n`);
        expect(errorMessage).toContain('Shape: constant (skewness=N/A)');
    });

    test("Should show right-skewed shape for realistic latency distribution (n=50)", () => {
        // GIVEN a function with right-skewed durations (simulating realistic API latencies)
        const durations = [15.75,4.44,13.11,7.87,13.56,5.89,5.67,15.54,21.76,3.34,8.35,7.41,10.11,21.03,5.05,4.16,7.01,6.7,4.64,4.51,13.53,3.14,41.15,20.43,9.87,3.86,4.2,5.5,3.48,7.92,3.63,3.09,4.25,5,3.74,3.17,4.61,3.21,20.4,2.04,3.17,5.05,12.82,9.98,4.44,5.74,5.02,7.24,11.99,23.17];
        const I = durations.length;
        mockFunctionProcessTimes(durations);

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should show right-skewed shape with sparkline
        // eslint-disable-next-line no-console
        console.log(`\n--- Failure message (right-skewed latencies, n=${I}) ---\n${errorMessage}\n`);
        expect(errorMessage).toContain('Shape: right-skewed');
        expect(errorMessage).toContain('skewness=');
    });

    test("README example: realistic API latency P95 at 10ms budget (n=50)", () => {
        // GIVEN realistic right-skewed API latency durations (same data as above)
        const givenDurations = [15.75,4.44,13.11,7.87,13.56,5.89,5.67,15.54,21.76,3.34,8.35,7.41,10.11,21.03,5.05,4.16,7.01,6.7,4.64,4.51,13.53,3.14,41.15,20.43,9.87,3.86,4.2,5.5,3.48,7.92,3.63,3.09,4.25,5,3.74,3.17,4.61,3.21,20.4,2.04,3.17,5.05,12.82,9.98,4.44,5.74,5.02,7.24,11.99,23.17];
        const givenThreshold = 10;
        const givenQuantile = 95;
        mockFunctionProcessTimes(givenDurations);

        // WHEN asserting P95 should be within 10ms budget and it fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {iterations: givenDurations.length, quantile: givenQuantile});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the output is a realistic failure diagnostic
        // eslint-disable-next-line no-console
        console.log(`\n--- README example (P${givenQuantile} at ${givenThreshold}ms, n=${givenDurations.length}) ---\n${actualMessage}\n`);
        expect(actualMessage).toContain(`expected that ${givenQuantile}% of the time`);
        expect(actualMessage).toContain('Confidence Interval (CI):');
        expect(actualMessage).toContain('Relative Margin of Error (RME):');
        expect(actualMessage).toContain('Coefficient of Variation (CV):');
        expect(actualMessage).toContain('Sample adequacy:');
        expect(actualMessage).toContain('Interpretation:');
    });
});

describe("Benchmark log interpretability annotations", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    function getFailureMessage(durations: number[]): string {
        mockFunctionProcessTimes(durations);
        let errorMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: durations.length, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }
        return errorMessage;
    }

    test("should interpret as precise and consistent when RME is GOOD and CV is GOOD", () => {
        // GIVEN 31 identical durations producing GOOD RME and GOOD CV
        const givenDurations = Array(31).fill(10);

        // WHEN the quantile matcher fails
        const actualMessage = getFailureMessage(givenDurations);

        // THEN the output shows GOOD tags and safe-for-regression interpretation
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain('[GOOD <10%]');
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
        expect(actualMessage).toContain('Interpretation: results are precise and consistent (RME: GOOD <10%');
        expect(actualMessage).toContain('safe for regression detection');
    });

    test("should interpret as rough comparison when RME is FAIR and CV is FAIR", () => {
        // GIVEN durations with mocked FAIR RME (15%) and FAIR CV (0.2)
        const givenDurations = [8, 9, 10, 11, 12];
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            relativeMarginOfError: 15.0,
            coefficientOfVariation: 0.2,
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the output shows FAIR tags and rough-comparison interpretation
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain('Relative Margin of Error (RME): 15.00% [FAIR 10-30%]');
        expect(actualMessage).toContain('Coefficient of Variation (CV): 0.20 [FAIR 0.1-0.3]');
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
        expect(actualMessage).toContain('Interpretation: results are usable for rough comparison (RME: FAIR 10-30%, CV: FAIR 0.1-0.3)');
    });

    test("should interpret as approximate with high variance when RME is FAIR and CV is POOR", () => {
        // GIVEN durations with mocked FAIR RME (15%) and POOR CV (0.5)
        const givenDurations = [8, 9, 10, 11, 12];
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            relativeMarginOfError: 15.0,
            coefficientOfVariation: 0.5,
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation flags both approximate mean and high variance
        expect(actualMessage).toContain('Interpretation: mean is approximate and variance is high (RME: FAIR 10-30%, CV: POOR >0.3)');
        expect(actualMessage).toContain('investigate noise sources');
    });

    test("should interpret as precise but inconsistent when RME is GOOD and CV is POOR", () => {
        // GIVEN 31 durations with mocked GOOD RME (5%) and POOR CV (0.5)
        const givenDurations = Array(31).fill(10);
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            relativeMarginOfError: 5.0,
            coefficientOfVariation: 0.5,
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation flags inconsistent runs despite precise mean
        expect(actualMessage).toContain('Interpretation: mean is precise but individual runs vary widely (RME: GOOD <10%, CV: POOR >0.3)');
        expect(actualMessage).toContain('investigate noise sources');
    });

    test("should interpret as reliable when RME is GOOD and CV is FAIR", () => {
        // GIVEN 31 durations with mocked GOOD RME (5%) and FAIR CV (0.2)
        const givenDurations = Array(31).fill(10);
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            relativeMarginOfError: 5.0,
            coefficientOfVariation: 0.2,
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation confirms reliability with expected moderate variance
        expect(actualMessage).toContain('Interpretation: results are reliable (RME: GOOD <10%, CV: FAIR 0.1-0.3)');
        expect(actualMessage).toContain('moderate run-to-run variance is expected');
    });

    test("should include sample size note when RME is POOR and sample is inadequate", () => {
        // GIVEN 5 high-variance durations producing POOR RME and POOR sample adequacy
        const givenDurations = [5, 10, 15, 20, 25];

        // WHEN the quantile matcher fails
        const actualMessage = getFailureMessage(givenDurations);

        // THEN the interpretation mentions POOR sample size and remediation
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain('[POOR >30%]');
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
        expect(actualMessage).toContain('Interpretation: mean is not reliable (RME: POOR >30%, CV:');
        expect(actualMessage).toContain('POOR sample size');
        expect(actualMessage).toContain('try increasing iterations');
    });

    test("should not include sample size note when RME is POOR but sample is adequate", () => {
        // GIVEN 31 durations with mocked POOR RME (40%) and POOR CV (0.5)
        const givenDurations = Array(31).fill(10);
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            relativeMarginOfError: 40.0,
            coefficientOfVariation: 0.5,
            isSmallSample: false,
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation omits sample size note for adequate samples
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain('[POOR >30%]');
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
        expect(actualMessage).toContain('Interpretation: mean is not reliable (RME: POOR >30%, CV: POOR >0.3)');
        expect(actualMessage).toContain('try increasing iterations');
        expect(actualMessage).not.toContain('sample size');
    });

    test("should note CI upper bound exceeds threshold when lower bound is within budget", () => {
        // GIVEN durations with mocked CI [5.0, 15.0] and a threshold of 8ms
        const givenDurations = [8, 9, 10, 11, 12];
        mockFunctionProcessTimes(givenDurations);

        const givenCILower = 5.0;
        const givenCIUpper = 15.0;
        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            confidenceInterval: [givenCILower, givenCIUpper] as [number, number],
            relativeMarginOfError: 50.0,
            coefficientOfVariation: 0.5,
        });
        const givenThreshold = 8;

        // WHEN the quantile matcher fails (Q1=8.04 > 8ms)
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation notes the CI upper bound exceeds the budget
        const expectedUpperBound = givenCIUpper.toFixed(2);
        expect(actualMessage).toContain(`CI upper bound (${expectedUpperBound}ms) exceeds your ${givenThreshold}ms threshold`);
        expect(actualMessage).toContain('consider optimizing the code or raising the threshold');
    });

    test("should note CI is safely within budget when upper bound is below threshold", () => {
        // GIVEN 31 identical durations (mean=10, CI≈[10,10]) and a generous threshold of 100ms
        const givenDurations = Array(31).fill(10);
        mockFunctionProcessTimes(givenDurations);
        const givenThreshold = 100;

        // WHEN the .not quantile matcher fails (quantile <= threshold, so .not throws)
        let actualMessage = '';
        try {
            expect(() => undefined).not.toCompleteWithinQuantile(givenThreshold, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation confirms the CI is within budget
        expect(actualMessage).toContain('safely within budget');
    });

    test("should note CI is entirely above threshold when lower bound exceeds budget", () => {
        // GIVEN durations with mean≈102 and a threshold of 1ms
        const givenDurations = [100, 101, 102, 103, 104];
        mockFunctionProcessTimes(givenDurations);
        const givenThreshold = 1;

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN the interpretation flags the code as almost certainly too slow
        expect(actualMessage).toContain(`entirely above your ${givenThreshold}ms threshold`);
        expect(actualMessage).toContain('almost certainly too slow');
    });

    test("should show no tags when CI is null (n=1)", () => {
        // GIVEN a single duration producing null CI, RME, and CV
        const givenDurations = [10];

        // WHEN the quantile matcher fails
        const actualMessage = getFailureMessage(givenDurations);

        // THEN no classification tags appear and interpretation says unreliable
        expect(actualMessage).toContain('Confidence Interval (CI): N/A (insufficient data)');
        expect(actualMessage).not.toContain('[GOOD');
        expect(actualMessage).not.toContain('[FAIR');
        expect(actualMessage).not.toContain('[POOR');
        expect(actualMessage).toContain('Relative Margin of Error (RME): N/A');
        expect(actualMessage).toContain('Coefficient of Variation (CV): N/A');
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
        expect(actualMessage).toContain('Interpretation: results are unreliable');
    });

    test("should show FAIR sample adequacy when n=10", () => {
        // GIVEN 10 identical durations
        const givenDurations = Array(10).fill(10);

        // WHEN the quantile matcher fails
        const actualMessage = getFailureMessage(givenDurations);

        // THEN sample adequacy is FAIR
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
    });

    test("should show FAIR sample adequacy when n=30", () => {
        // GIVEN 30 identical durations
        const givenDurations = Array(30).fill(10);

        // WHEN the quantile matcher fails
        const actualMessage = getFailureMessage(givenDurations);

        // THEN sample adequacy is FAIR
        const expectedSampleTag = formatTag(classifySampleAdequacy(givenDurations.length));
        expect(actualMessage).toContain(`Sample adequacy: ${expectedSampleTag} (n=${givenDurations.length})`);
    });

    test("should show no RME/CV tags when RME is null but CI exists (mean=0)", () => {
        // GIVEN durations with mocked mean=0 (produces null RME and CV but non-null CI)
        const givenDurations = [8, 9, 10, 11, 12];
        mockFunctionProcessTimes(givenDurations);

        const givenStats = metrics.calcStats(givenDurations);
        jest.spyOn(metrics, 'calcStats').mockReturnValue({
            ...givenStats,
            mean: 0,
            relativeMarginOfError: null,
            coefficientOfVariation: null,
            confidenceInterval: [givenStats.confidenceInterval![0], givenStats.confidenceInterval![1]],
        });

        // WHEN the quantile matcher fails
        let actualMessage = '';
        try {
            expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
        } catch (e) {
            actualMessage = (e as Error).message;
        }

        // THEN CI exists but has no tag, and interpretation explains mean≈0 limitation
        expect(actualMessage).toContain('Confidence Interval (CI): 95% [');
        expect(actualMessage).not.toMatch(/Confidence Interval \(CI\): 95% \[.*]ms \[/);
        expect(actualMessage).toContain('Relative Margin of Error (RME): N/A');
        expect(actualMessage).toContain('Coefficient of Variation (CV): N/A');
        expect(actualMessage).toContain('Interpretation: relative error cannot be computed');
    });
});

describe("Test jest expect.toResolveWithinQuantile assertion", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    })

    test("Should pass the assertion (async)", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) milliseconds
        const Q = 1
        // THEN expect success
        await expect(async () => await Promise.resolve()).toResolveWithinQuantile(T, {iterations: I, quantile: Q});
    });

    test("Should pass the assertion (promise)", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5
        mockFunctionProcessTimes(Array(I).fill(T));

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) milliseconds
        const Q = 1
        // THEN expect success
        await expect(() => Promise.resolve()).toResolveWithinQuantile(T, {iterations: I, quantile: Q});
    });

    test("Should fail the assertion", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) - 1 milliseconds
        // THEN expect to fail
        const Q = 1;
        const expectedStatsBlock = buildStatsBlock(T_Array, T - 1);
        await expect(async () => {
            await expect(() => Promise.resolve()).toResolveWithinQuantile(T - 1, {iterations: I, quantile: Q});
        }).rejects.toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be less or equal to ${printExpected(T - 1)} (ms),\ninstead it was ${printReceived(T)} (ms)\n\n${expectedStatsBlock}`);
    });

    test("Should not to pass the assertion", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will not resolve in (T) milliseconds
        // THEN expect to fail
        const Q = 1;
        const expectedStatsBlock = buildStatsBlock(T_Array, T);
        await expect(async () => {
            await expect(() => Promise.resolve()).not.toResolveWithinQuantile(T, {iterations: I, quantile: Q});
        }).rejects.toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be greater than ${printExpected(T)} (ms),\ninstead it was ${printReceived(T)} (ms)\n\n${expectedStatsBlock}`);
    });

    test("Should fail the assertion if the promise is rejected", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) - 1 milliseconds
        // AND the promise rejects
        // THEN expect to fail
        const Q = 1
        await expect(async () => {
            await expect(() => Promise.reject("Rejected for some reason")).toResolveWithinQuantile(T, {
                iterations: I,
                quantile: Q
            });
        }).rejects.toEqual("Rejected for some reason");
    });

    test("Should base calculations of the the expected quantile based on the iterations arguments", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting toResolveWithinQuantile(T,I,Q)
        const Q = 1;
        jest.spyOn(metrics, 'calcQuantile')
        // THEN expect the function to have been called (I) times
        await expect(mockFn).toResolveWithinQuantile(T, {iterations: I, quantile: Q});
        expect(mockFn).toBeCalledTimes(I);
        // AND quantile arguments are (Q), function durations
        expect(metrics.calcQuantile).toHaveBeenCalledWith(Q, T_Array);
    });

    test("Should run warmup iterations before measured iterations", async () => {
        // GIVEN a promise with warmup and measured iterations
        const T = 10;
        const I = 3;
        const W = 2;
        mockFunctionProcessTimes(Array(W + I).fill(T));
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting with warmup
        await expect(mockFn).toResolveWithinQuantile(T, {iterations: I, quantile: 1, warmup: W});

        // THEN expect the callback to have been called warmup + iterations times
        expect(mockFn).toBeCalledTimes(W + I);
    });

    test("Should only include measured iterations in durations when warmup is used", async () => {
        // GIVEN a promise with warmup iterations
        const T = 10;
        const I = 3;
        const W = 2;
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(Array(W + I).fill(T));
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting with warmup
        jest.spyOn(metrics, 'calcQuantile');
        await expect(mockFn).toResolveWithinQuantile(T, {iterations: I, quantile: 1, warmup: W});

        // THEN only measured iterations are passed to calcQuantile
        expect(metrics.calcQuantile).toHaveBeenCalledWith(1, T_Array);
    });

    test("Should remove outliers when outliers option is 'remove'", async () => {
        // GIVEN a promise with some outlier durations
        const I = 6;
        const durations = [10, 11, 12, 10, 11, 100];
        mockFunctionProcessTimes(durations);
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting with outliers: 'remove'
        jest.spyOn(metrics, 'removeOutliers');
        await expect(mockFn).toResolveWithinQuantile(15, {iterations: I, quantile: 95, outliers: 'remove'});

        // THEN removeOutliers should be called with the durations
        expect(metrics.removeOutliers).toHaveBeenCalledWith(durations);
    });

    test("Should keep outliers by default", async () => {
        // GIVEN a promise with durations
        const I = 5;
        const T_Array = Array(I).fill(10);
        mockFunctionProcessTimes(T_Array);
        const mockFn = jest.fn(() => Promise.resolve());

        // WHEN asserting without outliers option
        jest.spyOn(metrics, 'removeOutliers');
        await expect(mockFn).toResolveWithinQuantile(15, {iterations: I, quantile: 95});

        // THEN removeOutliers should not be called
        expect(metrics.removeOutliers).not.toHaveBeenCalled();
    });

    test("Should show Shape line in async failure message", async () => {
        // GIVEN a promise with varying durations
        const durations = [5, 10, 15, 20, 25];
        const I = durations.length;
        mockFunctionProcessTimes(durations);

        // WHEN asserting and it fails
        let errorMessage = '';
        try {
            await expect(() => Promise.resolve()).toResolveWithinQuantile(1, {iterations: I, quantile: 1});
        } catch (e) {
            errorMessage = (e as Error).message;
        }

        // THEN the message should contain the Shape line
        // eslint-disable-next-line no-console
        console.log(`\n--- Async failure message (symmetric, n=${I}) ---\n${errorMessage}\n`);
        expect(errorMessage).toContain('Shape:');
        expect(errorMessage).toContain('skewness=');
    });
});

describe("Input validation", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe("toCompleteWithin", () => {
        test("should throw when received value is not a function", () => {
            // GIVEN a non-function value
            const givenValue = "not a function";

            // WHEN asserting toCompleteWithin
            // THEN expect a descriptive error
            expect(() => {
                (expect(givenValue as unknown) as unknown as jest.Matchers<void>).toCompleteWithin(10);
            }).toThrowError("jest-performance-matchers: expected value must be a function, received string");
        });

        test("should throw when duration is negative", () => {
            // GIVEN a negative duration
            const givenDuration = -5;

            // WHEN asserting toCompleteWithin with negative duration
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithin(givenDuration);
            }).toThrowError("jest-performance-matchers: expected duration must be a positive number, received -5");
        });

        test("should throw when duration is zero", () => {
            // GIVEN a zero duration
            const givenDuration = 0;

            // WHEN asserting toCompleteWithin with zero duration
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithin(givenDuration);
            }).toThrowError("jest-performance-matchers: expected duration must be a positive number, received 0");
        });

        test("should throw when duration is NaN", () => {
            // GIVEN NaN as duration
            // WHEN asserting toCompleteWithin
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithin(NaN);
            }).toThrowError("jest-performance-matchers: expected duration must be a positive number, received NaN");
        });

        test("should throw when duration is Infinity", () => {
            // GIVEN Infinity as duration
            // WHEN asserting toCompleteWithin
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithin(Infinity);
            }).toThrowError("jest-performance-matchers: expected duration must be a positive number, received Infinity");
        });
    });

    describe("toResolveWithin", () => {
        test("should throw when received value is not a function", async () => {
            // GIVEN a non-function value
            const givenValue = 42;

            // WHEN asserting toResolveWithin
            // THEN expect a descriptive error
            await expect(async () => {
                await (expect(givenValue as unknown) as unknown as jest.Matchers<Promise<void>>).toResolveWithin(10);
            }).rejects.toThrowError("jest-performance-matchers: expected value must be a function, received number");
        });

        test("should throw when duration is negative", async () => {
            // GIVEN a negative duration
            const givenDuration = -5;

            // WHEN asserting toResolveWithin with negative duration
            // THEN expect a descriptive error
            await expect(async () => {
                await expect(async () => Promise.resolve()).toResolveWithin(givenDuration);
            }).rejects.toThrowError("jest-performance-matchers: expected duration must be a positive number, received -5");
        });
    });

    describe("toCompleteWithinQuantile", () => {
        test("should throw when received value is not a function", () => {
            // GIVEN a non-function value
            const givenValue = null;

            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                (expect(givenValue as unknown) as unknown as jest.Matchers<void>).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95});
            }).toThrowError("jest-performance-matchers: expected value must be a function, received object");
        });

        test("should throw when options is not provided", () => {
            // GIVEN no options
            // WHEN asserting toCompleteWithinQuantile without options
            // THEN expect a descriptive error
            expect(() => {
                (expect(() => undefined) as unknown as jest.Matchers<void>).toCompleteWithinQuantile(10, undefined as unknown as { iterations: number, quantile: number });
            }).toThrowError("jest-performance-matchers: options must be an object with iterations and quantile");
        });

        test("should throw when iterations is not a positive integer", () => {
            // GIVEN invalid iterations
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 0, quantile: 95});
            }).toThrowError("jest-performance-matchers: iterations must be a positive integer, received 0");
        });

        test("should throw when iterations is a float", () => {
            // GIVEN float iterations
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 1.5, quantile: 95});
            }).toThrowError("jest-performance-matchers: iterations must be a positive integer, received 1.5");
        });

        test("should throw when quantile is out of range", () => {
            // GIVEN quantile > 100
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 101});
            }).toThrowError("jest-performance-matchers: quantile must be an integer between 1 and 100, received 101");
        });

        test("should throw when quantile is zero", () => {
            // GIVEN quantile = 0
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 0});
            }).toThrowError("jest-performance-matchers: quantile must be an integer between 1 and 100, received 0");
        });

        test("should throw when warmup is negative", () => {
            // GIVEN negative warmup
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, warmup: -1});
            }).toThrowError("jest-performance-matchers: warmup must be a non-negative integer, received -1");
        });

        test("should throw when warmup is a float", () => {
            // GIVEN float warmup
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, warmup: 1.5});
            }).toThrowError("jest-performance-matchers: warmup must be a non-negative integer, received 1.5");
        });

        test("should throw when outliers option is invalid", () => {
            // GIVEN invalid outliers option
            // WHEN asserting toCompleteWithinQuantile
            // THEN expect a descriptive error
            expect(() => {
                expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, outliers: 'invalid' as 'remove' | 'keep'});
            }).toThrowError("jest-performance-matchers: outliers must be 'remove' or 'keep', received 'invalid'");
        });
    });

    describe("toResolveWithinQuantile", () => {
        test("should throw when received value is not a function", async () => {
            // GIVEN a non-function value
            const givenValue = true;

            // WHEN asserting toResolveWithinQuantile
            // THEN expect a descriptive error
            await expect(async () => {
                await (expect(givenValue as unknown) as unknown as jest.Matchers<Promise<void>>).toResolveWithinQuantile(10, {iterations: 5, quantile: 95});
            }).rejects.toThrowError("jest-performance-matchers: expected value must be a function, received boolean");
        });

        test("should throw when iterations is negative", async () => {
            // GIVEN negative iterations
            // WHEN asserting toResolveWithinQuantile
            // THEN expect a descriptive error
            await expect(async () => {
                await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {iterations: -1, quantile: 95});
            }).rejects.toThrowError("jest-performance-matchers: iterations must be a positive integer, received -1");
        });
    });
});