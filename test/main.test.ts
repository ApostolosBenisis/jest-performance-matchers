import '../src/main';
import * as metrics from '../src/metrics';
import {printExpected, printReceived} from "jest-matcher-utils";


function mockFunctionProcessTime(milliseconds: number) {
    mockFunctionProcessTimes([milliseconds]);
}

function buildStatsBlock(durations: number[]): string {
    const stats = metrics.calcStats(durations);
    const fmt = (v: number | null) => v !== null ? v.toFixed(2) : 'N/A';

    const ciText = stats.confidenceInterval === null
        ? '95% CI: N/A (insufficient data)'
        : `95% CI: [${stats.confidenceInterval[0].toFixed(2)}, ${stats.confidenceInterval[1].toFixed(2)}]ms`;
    const rmeText = `RME: ${stats.relativeMarginOfError === null ? 'N/A' : stats.relativeMarginOfError.toFixed(2) + '%'}`;
    const cvText = `CV: ${stats.coefficientOfVariation === null ? 'N/A' : stats.coefficientOfVariation.toFixed(2)}`;

    const p25 = metrics.calcQuantile(25, durations);
    const p50 = stats.median;
    const p75 = metrics.calcQuantile(75, durations);
    const p90 = metrics.calcQuantile(90, durations);

    const lines = [
        `Statistics (n=${stats.n}): mean=${fmt(stats.mean)}ms, median=${fmt(stats.median)}ms, stddev=${fmt(stats.stddev)}ms`,
        `${ciText} | ${rmeText} | ${cvText}`,
        `Distribution: min=${fmt(stats.min)}ms | P25=${fmt(p25)}ms | P50=${fmt(p50)}ms | P75=${fmt(p75)}ms | P90=${fmt(p90)}ms | max=${fmt(stats.max)}ms`,
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
        const expectedStatsBlock = buildStatsBlock(T_Array);

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
        const expectedStatsBlock = buildStatsBlock([T]);
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
        const expectedStatsBlock = buildStatsBlock(T_Array);

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
        expect(errorMessage).toContain('95% CI: N/A (insufficient data)');
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
        expect(errorMessage).toContain('RME: N/A');
        expect(errorMessage).toContain('CV: N/A');
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
        const expectedStatsBlock = buildStatsBlock(T_Array);
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
        const expectedStatsBlock = buildStatsBlock(T_Array);
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