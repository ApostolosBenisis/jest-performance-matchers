import '../src/main';
import * as metrics from '../src/metrics';
import {calcShapeDiagnostics} from '../src/shape';
import {
  classifyRME,
  classifyCV,
  classifyMAD,
  classifySampleAdequacy,
  generateInterpretation,
  formatTag
} from '../src/diagnostics';
import {formatMs} from '../src/format';
import {printExpected, printReceived} from 'jest-matcher-utils';
import {mockFunctionProcessTimes} from './test-utils';

function buildStatsBlock(durations: number[], expectedDuration?: number, setupTeardownActive?: boolean, errorInfo?: {
  errorCount: number;
  totalIterations: number;
  allowedRate: number
}): string {
  const stats = metrics.calcStats(durations);
  const fmt = (v: number | null) => v !== null ? formatMs(v) : 'N/A';

  const rmeTag = classifyRME(stats.relativeMarginOfError);
  const cvTag = classifyCV(stats.coefficientOfVariation);

  const ciText = stats.confidenceInterval === null
    ? 'Confidence Interval (CI): N/A (insufficient data)'
    : `Confidence Interval (CI): 95% [${formatMs(stats.confidenceInterval[0])}, ${formatMs(stats.confidenceInterval[1])}]ms`;
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

  const madTag = classifyMAD(stats.mad, stats.median);
  const madText = stats.mad === null
    ? 'Median Absolute Deviation (MAD): N/A'
    : `Median Absolute Deviation (MAD): ${formatMs(stats.mad)}ms${madTag !== null ? ` [${formatTag(madTag)}]` : ''}`;

  const lines = [
    `Statistics (n=${stats.n}${setupTeardownActive ? ', setup/teardown active' : ''}): mean=${fmt(stats.mean)}ms, median=${fmt(stats.median)}ms, stddev=${fmt(stats.stddev)}ms`,
    ciText,
    rmeText,
    cvText,
    madText,
    `Distribution: min=${fmt(stats.min)}ms | P25=${fmt(p25)}ms | P50=${fmt(p50)}ms | P75=${fmt(p75)}ms | P90=${fmt(p90)}ms | max=${fmt(stats.max)}ms`,
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

describe("Test jest expect.toCompleteWithinQuantile assertion", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  })

  test("Should pass the assertion", () => {
    // GIVEN a function that completes within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting that it completes within the threshold at the given quantile
    const givenQuantile = 1
    // THEN expect success
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: givenQuantile
    });
  });

  test("Should fail the assertion", () => {
    // GIVEN a function that completes within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting with a threshold below the actual duration at the given quantile
    // THEN expect to fail
    const givenQuantile = 1;
    const expectedStatsBlock = buildStatsBlock(givenDurations, givenDuration - 1);

    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {
        iterations: givenIterations,
        quantile: givenQuantile
      });
    }).toThrowError(`expected that ${givenQuantile}% of the time when running ${givenIterations} iterations,\nthe function duration to be less or equal to ${printExpected(givenDuration - 1)} (ms),\ninstead it was ${printReceived(givenDuration)} (ms)\n\n${expectedStatsBlock}`);
  });

  test("Should show N/A for stddev when only one iteration is run", () => {
    // GIVEN a function that completes within the given duration
    const givenDuration = 10;
    mockFunctionProcessTimes([givenDuration]);

    // WHEN asserting with iterations=1 and it fails,
    // THEN the stats-block should show N/A for stddev (n=1 cannot compute stddev)
    const expectedStatsBlock = buildStatsBlock([givenDuration], givenDuration - 1);
    expect(expectedStatsBlock).toContain("stddev=N/A");

    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: 1, quantile: 1});
    }).toThrowError(expectedStatsBlock);
  });

  test("Should not to pass the assertion", () => {
    // GIVEN a function that completes within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting that it completes within the threshold at the given quantile
    // THEN expect to fail
    const givenQuantile = 1;
    const expectedStatsBlock = buildStatsBlock(givenDurations, givenDuration);

    expect(() => {
      expect(() => undefined).not.toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations,
        quantile: givenQuantile
      });
    }).toThrowError(`expected that ${givenQuantile}% of the time when running ${givenIterations} iterations,\nthe function duration to be greater than ${printExpected(givenDuration)} (ms),\ninstead it was ${printReceived(givenDuration)} (ms)\n\n${expectedStatsBlock}`);
  });

  test("Should base calculations of the the expected quantile based on the iterations arguments", () => {
    // GIVEN a function that completes within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);
    const mockFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile(givenDuration,I,Q)
    const givenQuantile = 1;
    jest.spyOn(metrics, 'calcQuantile')
    // THEN the function is called once per measured iteration
    expect(mockFn).toCompleteWithinQuantile(givenDuration, {iterations: givenIterations, quantile: givenQuantile});
    expect(mockFn).toBeCalledTimes(givenIterations);
    // AND the quantile is computed from the measured durations
    expect(metrics.calcQuantile).toHaveBeenCalledWith(givenQuantile, givenDurations);
  });

  test("Should run warmup iterations before measured iterations", () => {
    // GIVEN a function with warmup and measured iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenWarmup = 2;
    // AND warmup iterations run before measurement begins
    mockFunctionProcessTimes(Array(givenWarmup + givenIterations).fill(givenDuration));
    const mockFn = jest.fn();

    // WHEN asserting with warmup
    expect(mockFn).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: 1,
      warmup: givenWarmup
    });

    // THEN expect the callback to have been called warmup + iterations times
    expect(mockFn).toBeCalledTimes(givenWarmup + givenIterations);
  });

  test("Should only include measured iterations in durations when warmup is used", () => {
    // GIVEN a function with warmup iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenWarmup = 2;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(Array(givenWarmup + givenIterations).fill(givenDuration));
    const mockFn = jest.fn();

    // WHEN asserting with warmup
    jest.spyOn(metrics, 'calcQuantile');
    expect(mockFn).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: 1,
      warmup: givenWarmup
    });

    // THEN only measured iterations are passed to calcQuantile
    expect(metrics.calcQuantile).toHaveBeenCalledWith(1, givenDurations);
  });

  test("Should remove outliers when outliers option is 'remove'", () => {
    // GIVEN a function with some outlier durations
    const givenIterations = 6;
    const durations = [10, 11, 12, 10, 11, 100];
    mockFunctionProcessTimes(durations);
    const mockFn = jest.fn();

    // WHEN asserting with outliers: 'remove'
    jest.spyOn(metrics, 'removeOutliers');
    expect(mockFn).toCompleteWithinQuantile(15, {iterations: givenIterations, quantile: 95, outliers: 'remove'});

    // THEN removeOutliers should be called with the durations
    expect(metrics.removeOutliers).toHaveBeenCalledWith(durations);
  });

  test("Should keep outliers by default", () => {
    // GIVEN a function with some outlier durations
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(10);
    mockFunctionProcessTimes(givenDurations);
    const mockFn = jest.fn();

    // WHEN asserting without outliers option
    jest.spyOn(metrics, 'removeOutliers');
    expect(mockFn).toCompleteWithinQuantile(15, {iterations: givenIterations, quantile: 95});

    // THEN removeOutliers should not be called
    expect(metrics.removeOutliers).not.toHaveBeenCalled();
  });

  test("Should show CI unavailable and warnings for n=1", () => {
    // GIVEN a function that runs a single iteration
    const givenDuration = 10;
    mockFunctionProcessTimes([givenDuration]);

    // WHEN asserting with iterations=1 and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: 1, quantile: 1});
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
    const givenDuration = 10;
    const givenIterations = 5;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the message should contain the small sample warning
    expect(errorMessage).toContain('Warnings:');
    expect(errorMessage).toContain('Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values');
  });

  test("Should not show warnings for large sample size (n>=31)", () => {
    // GIVEN a function that runs for a large sample (n=31)
    const givenDuration = 10;
    const givenIterations = 31;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the message should not contain warnings
    expect(errorMessage).not.toContain('Warnings:');
  });

  test("Should show correct distribution percentiles", () => {
    // GIVEN a function with varying durations
    const durations = [5, 10, 15, 20, 25];
    const givenIterations = durations.length;
    mockFunctionProcessTimes(durations);

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the distribution line should contain the correct percentile values
    const p25 = formatMs(metrics.calcQuantile(25, durations));
    const p50 = formatMs(metrics.calcQuantile(50, durations));
    const p75 = formatMs(metrics.calcQuantile(75, durations));
    const p90 = formatMs(metrics.calcQuantile(90, durations));
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
    // We test this by checking the stats-block output when calcStats would produce null RME/CV.
    const givenDuration = 10;
    mockFunctionProcessTimes([givenDuration]);

    // WHEN asserting with iterations=1 (stddev=null, so CV=null, and CI=null so RME=null)
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: 1, quantile: 1});
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
    const givenIterations = durations.length;
    mockFunctionProcessTimes(durations);

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the message should contain the Shape line with label and sparkline
    // eslint-disable-next-line no-console
    console.log(`\n--- Failure message (symmetric, n=${givenIterations}) ---\n${errorMessage}\n`);
    expect(errorMessage).toContain('Shape:');
    expect(errorMessage).toContain('skewness=');
  });

  test("Should show 'insufficient data' shape for n=1", () => {
    // GIVEN a function with a single iteration
    const givenDuration = 10;
    mockFunctionProcessTimes([givenDuration]);

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: 1, quantile: 1});
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
    const givenDuration = 10;
    const givenIterations = 5;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the shape should be 'constant' since all values are the same
    // eslint-disable-next-line no-console
    console.log(`\n--- Failure message (constant, n=${givenIterations}) ---\n${errorMessage}\n`);
    expect(errorMessage).toContain('Shape: constant (skewness=N/A)');
  });

  test("Should show right-skewed shape for realistic latency distribution (n=50)", () => {
    // GIVEN a function with right-skewed durations (simulating realistic API latencies)
    const durations = [15.75, 4.44, 13.11, 7.87, 13.56, 5.89, 5.67, 15.54, 21.76, 3.34, 8.35, 7.41, 10.11, 21.03, 5.05, 4.16, 7.01, 6.7, 4.64, 4.51, 13.53, 3.14, 41.15, 20.43, 9.87, 3.86, 4.2, 5.5, 3.48, 7.92, 3.63, 3.09, 4.25, 5, 3.74, 3.17, 4.61, 3.21, 20.4, 2.04, 3.17, 5.05, 12.82, 9.98, 4.44, 5.74, 5.02, 7.24, 11.99, 23.17];
    const givenIterations = durations.length;
    mockFunctionProcessTimes(durations);

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the message should show right-skewed shape with sparkline
    // eslint-disable-next-line no-console
    console.log(`\n--- Failure message (right-skewed latencies, n=${givenIterations}) ---\n${errorMessage}\n`);
    expect(errorMessage).toContain('Shape: right-skewed');
    expect(errorMessage).toContain('skewness=');
  });

  test("README example: realistic API latency P95 at 10ms budget (n=50)", () => {
    // GIVEN realistic right-skewed API latency durations (same data as above)
    const givenDurations = [15.75, 4.44, 13.11, 7.87, 13.56, 5.89, 5.67, 15.54, 21.76, 3.34, 8.35, 7.41, 10.11, 21.03, 5.05, 4.16, 7.01, 6.7, 4.64, 4.51, 13.53, 3.14, 41.15, 20.43, 9.87, 3.86, 4.2, 5.5, 3.48, 7.92, 3.63, 3.09, 4.25, 5, 3.74, 3.17, 4.61, 3.21, 20.4, 2.04, 3.17, 5.05, 12.82, 9.98, 4.44, 5.74, 5.02, 7.24, 11.99, 23.17];
    const givenThreshold = 10;
    const givenQuantile = 95;
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting P95 should be within 10ms budget and it fails
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {
        iterations: givenDurations.length,
        quantile: givenQuantile
      });
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

describe("Setup/teardown options (sync)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should call setup once and teardown once when both are provided", () => {
    // GIVEN a function with suite-level setup and teardown hooks
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupFn = jest.fn();
    const givenTeardownFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with setup and teardown
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, setup: givenSetupFn, teardown: givenTeardownFn,
    });

    // THEN setup is called exactly once (suite-level)
    expect(givenSetupFn).toHaveBeenCalledTimes(1);
    // AND teardown is called exactly once (suite-level)
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
  });

  test("should call setupEach before each measured iteration when setupEach is provided", () => {
    // GIVEN a function with a per-iteration setupEach hook and 5 iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupEachFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with setupEach
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, setupEach: givenSetupEachFn,
    });

    // THEN setupEach is called once per iteration
    expect(givenSetupEachFn).toHaveBeenCalledTimes(givenIterations);
  });

  test("should call teardownEach after each measured iteration when teardownEach is provided", () => {
    // GIVEN a function with a per-iteration teardownEach hook and 5 iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenTeardownEachFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with teardownEach
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, teardownEach: givenTeardownEachFn,
    });

    // THEN teardownEach is called once per iteration
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(givenIterations);
  });

  test("should call setupEach and teardownEach during warmup iterations when warmup is configured", () => {
    // GIVEN a function with per-iteration hooks, 3 measured iterations and 2 warmup iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenWarmup = 2;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupEachFn = jest.fn();
    const givenTeardownEachFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with warmup
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, warmup: givenWarmup,
      setupEach: givenSetupEachFn, teardownEach: givenTeardownEachFn,
    });

    // THEN setupEach is called for warmup + measured = total times
    const expectedTotalCalls = givenWarmup + givenIterations;
    expect(givenSetupEachFn).toHaveBeenCalledTimes(expectedTotalCalls);
    // AND teardownEach is called the same number of times
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(expectedTotalCalls);
  });

  test("should work with only setupEach (no teardownEach) when only setupEach is provided", () => {
    // GIVEN a function with only setupEach (no teardownEach)
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupEachFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with only setupEach
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, setupEach: givenSetupEachFn,
    });

    // THEN setupEach is called once per iteration
    expect(givenSetupEachFn).toHaveBeenCalledTimes(givenIterations);
  });

  test("should work with only teardownEach (no setupEach) when only teardownEach is provided", () => {
    // GIVEN a function with only teardownEach (no setupEach)
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenTeardownEachFn = jest.fn();

    // WHEN asserting toCompleteWithinQuantile with only teardownEach
    expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, teardownEach: givenTeardownEachFn,
    });

    // THEN teardownEach is called once per iteration
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(givenIterations);
  });

  test("should propagate setup error immediately when setup throws", () => {
    // GIVEN a function with a setup hook that throws
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenSetupError = "foo-setup-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN setup throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        setup: () => {
          throw new Error(givenSetupError);
        },
      });
    }).toThrowError(givenSetupError);
  });

  test("should propagate teardown error immediately when teardown throws", () => {
    // GIVEN a function with a teardown hook that throws
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenTeardownError = "foo-teardown-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN teardown throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        teardown: () => {
          throw new Error(givenTeardownError);
        },
      });
    }).toThrowError(givenTeardownError);
  });

  test("should propagate setupEach error immediately when setupEach throws", () => {
    // GIVEN a function with a setupEach hook that throws
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenSetupEachError = "foo-setupEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN setupEach throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        setupEach: () => {
          throw new Error(givenSetupEachError);
        },
      });
    }).toThrowError(givenSetupEachError);
  });

  test("should still call teardown when setupEach throws", () => {
    // GIVEN a function with setupEach that throws and a suite-level teardown
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenSetupEachError = "foo-setupEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSuiteState = "foo-suite";
    const givenTeardownFn = jest.fn();

    // WHEN setupEach throws on the first iteration
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        setup: () => givenSuiteState,
        setupEach: () => {
          throw new Error(givenSetupEachError);
        },
        teardown: givenTeardownFn,
      });
    }).toThrowError(givenSetupEachError);

    // THEN teardown is still called via outer try/finally
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the suite state
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSuiteState);
  });

  test("should propagate teardownEach error immediately when teardownEach throws", () => {
    // GIVEN a function with a teardownEach hook that throws
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenTeardownEachError = "foo-teardownEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN teardownEach throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        teardownEach: () => {
          throw new Error(givenTeardownEachError);
        },
      });
    }).toThrowError(givenTeardownEachError);
  });

  test("should show 'setup/teardown active' hint in stats-block when setup is provided", () => {
    // GIVEN a function that exceeds the budget with a setup hook
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN the assertion fails
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {
        iterations: givenIterations, quantile: givenQuantile,
        setup: () => { /* noop */
        },
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the stats-block includes the 'setup/teardown active' hint
    expect(actualMessage).toContain('setup/teardown active');
  });

  test("should show 'setup/teardown active' hint in stats-block when setupEach is provided", () => {
    // GIVEN a function that exceeds the budget with a setupEach hook
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN the assertion fails
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {
        iterations: givenIterations, quantile: givenQuantile,
        setupEach: () => { /* noop */
        },
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the stats-block includes the 'setup/teardown active' hint
    expect(actualMessage).toContain('setup/teardown active');
  });

  test("should NOT show 'setup/teardown active' hint when no hooks are provided", () => {
    // GIVEN a function that exceeds the budget without any hooks
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN the assertion fails
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenDuration - 1, {
        iterations: givenIterations, quantile: givenQuantile,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the stats-block does NOT include the 'setup/teardown active' hint
    expect(actualMessage).not.toContain('setup/teardown active');
  });

  test("should show 'setup/teardown active' hint in .not negation message when setup is provided", () => {
    // GIVEN a function that completes within the budget with a setup hook
    const givenDuration = 10;
    const givenIterations = 5;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN using .not negation (expecting the assertion to fail)
    // THEN the error message includes the 'setup/teardown active' hint
    expect(() => {
      expect(() => undefined).not.toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        setup: () => { /* noop */
        },
      });
    }).toThrowError(/setup\/teardown active/);
  });

  test("should call setup once, then setupEach before hrtime, then teardownEach after hrtime, then teardown once when all hooks are provided", () => {
    // GIVEN a callback with all four hooks that record their call order
    const givenIterations = 1;
    const givenQuantile = 50;
    const actualCallOrder: string[] = [];
    jest.spyOn(process, "hrtime").mockImplementation(() => {
      actualCallOrder.push('hrtime');
      return [1, 0];
    });

    // WHEN asserting toCompleteWithinQuantile with all hooks for 1 iteration
    expect(() => {
      actualCallOrder.push('callback');
    }).toCompleteWithinQuantile(1000, {
      iterations: givenIterations, quantile: givenQuantile,
      setup: () => {
        actualCallOrder.push('setup');
      },
      teardown: () => {
        actualCallOrder.push('teardown');
      },
      setupEach: () => {
        actualCallOrder.push('setupEach');
      },
      teardownEach: () => {
        actualCallOrder.push('teardownEach');
      },
    });

    // THEN suite setup runs once, per-iteration hooks wrap each measurement, and suite teardown runs once at the end
    const expectedCallOrder = ['setup', 'setupEach', 'hrtime', 'callback', 'hrtime', 'teardownEach', 'teardown'];
    expect(actualCallOrder).toEqual(expectedCallOrder);
  });

  test("should pass setup return value to setupEach, callback, teardownEach, and teardown when all hooks return values", () => {
    // GIVEN a function with all four hooks that return and receive values
    const givenDuration = 10;
    const givenIterations = 2;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSuiteData = "foo-suite-state";
    let givenIterCounter = 0;
    const actualCallbackArgs: unknown[][] = [];
    const actualTeardownEachArgs: unknown[][] = [];
    const actualSetupEachArgs: unknown[] = [];
    let actualTeardownArg: unknown;

    // WHEN asserting toCompleteWithinQuantile with all four hooks
    expect((suiteState: unknown, iterState: unknown) => {
      actualCallbackArgs.push([suiteState, iterState]);
    }).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile,
      setup: () => givenSuiteData,
      setupEach: (suiteState) => {
        actualSetupEachArgs.push(suiteState);
        return ++givenIterCounter;
      },
      teardownEach: (suiteState, iterState) => {
        actualTeardownEachArgs.push([suiteState, iterState]);
      },
      teardown: (suiteState) => {
        actualTeardownArg = suiteState;
      },
    });

    // THEN setupEach receives suite state
    expect(actualSetupEachArgs).toEqual([givenSuiteData, givenSuiteData]);
    // AND callback receives both suite state and iter state
    expect(actualCallbackArgs).toEqual([[givenSuiteData, 1], [givenSuiteData, 2]]);
    // AND teardownEach receives both suite state and iter state
    expect(actualTeardownEachArgs).toEqual([[givenSuiteData, 1], [givenSuiteData, 2]]);
    // AND teardown receives suite state only
    expect(actualTeardownArg).toBe(givenSuiteData);
  });

  test("should pass setup return value during warmup iterations when warmup is configured", () => {
    // GIVEN a function with suite-level setup and per-iteration setupEach, with warmup
    const givenDuration = 10;
    const givenIterations = 2;
    const givenQuantile = 50;
    const givenWarmup = 2;
    const givenSuiteState = "foo-suite";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    let givenIterCounter = 0;
    const actualCallbackArgs: unknown[][] = [];

    // WHEN asserting toCompleteWithinQuantile with warmup
    expect((suiteState: unknown, iterState: unknown) => {
      actualCallbackArgs.push([suiteState, iterState]);
    }).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile, warmup: givenWarmup,
      setup: () => givenSuiteState,
      setupEach: () => ++givenIterCounter,
    });

    // THEN warmup (2) + measured (2) = 4 calls, all receive suite state and fresh iter state
    expect(actualCallbackArgs).toEqual([
      [givenSuiteState, 1], [givenSuiteState, 2], [givenSuiteState, 3], [givenSuiteState, 4],
    ]);
  });

  test("should pass undefined for both states when no hooks are provided", () => {
    // GIVEN a function with no hooks
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const actualCallbackArgs: unknown[][] = [];

    // WHEN asserting toCompleteWithinQuantile without any hooks
    expect((suiteState: unknown, iterState: unknown) => {
      actualCallbackArgs.push([suiteState, iterState]);
    }).toCompleteWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: givenQuantile,
    });

    // THEN callback receives undefined for both suite and iteration state
    expect(actualCallbackArgs).toEqual([
      [undefined, undefined], [undefined, undefined], [undefined, undefined],
    ]);
  });

  test("should throw validation error when setupEach is not a function", () => {
    // GIVEN an invalid setupEach value that is not a function
    const givenInvalidSetupEach = 42;

    // WHEN asserting toCompleteWithinQuantile with the invalid setupEach,
    // THEN a validation error is thrown
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(10, {
        iterations: 3,
        quantile: 50,
        // @ts-expect-error - intentionally passing invalid setupEach for testing
        setupEach: givenInvalidSetupEach
      });
    }).toThrowError("jest-performance-matchers: setupEach must be a function if provided, received number");
  });

  test("should throw validation error when teardownEach is not a function", () => {
    // GIVEN an invalid teardownEach value that is not a function
    const givenInvalidTeardownEach = "foo-not-a-function";

    // WHEN asserting toCompleteWithinQuantile with the invalid teardownEach,
    // THEN a validation error is thrown
    expect(() => {
      expect(() => undefined).toCompleteWithinQuantile(10, {
        iterations: 3,
        quantile: 50,
        // @ts-expect-error - intentionally passing invalid teardownEach for testing
        teardownEach: givenInvalidTeardownEach
      });
    }).toThrowError("jest-performance-matchers: teardownEach must be a function if provided, received string");
  });

  test("should still call teardown and teardownEach when callback throws", () => {
    // GIVEN a callback that throws on first iteration, with suite-level teardown and per-iteration teardownEach
    const givenDuration = 10;
    const givenIterations = 3;
    const givenQuantile = 50;
    const givenSuiteState = "foo-suite";
    const givenCallbackError = "foo-callback-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenTeardownFn = jest.fn();
    const givenTeardownEachFn = jest.fn();

    // WHEN the callback throws an error on the first iteration
    expect(() => {
      expect(() => {
        throw new Error(givenCallbackError);
      }).toCompleteWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: givenQuantile,
        setup: () => givenSuiteState,
        teardown: givenTeardownFn,
        teardownEach: givenTeardownEachFn,
      });
    }).toThrowError(givenCallbackError);

    // THEN teardownEach is called once (for the failing iteration)
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(1);
    // AND teardown is still called once with the suite state
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSuiteState);
  });
});

describe("Setup/teardown options (async)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should call async setup once and teardown once when both are provided", async () => {
    // GIVEN a promise with suite-level async setup and teardown hooks
    const givenDuration = 10;
    const givenIterations = 3;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupFn = jest.fn();
    const givenTeardownFn = jest.fn();

    // WHEN asserting toResolveWithinQuantile with setup and teardown
    await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50,
      setup: givenSetupFn, teardown: givenTeardownFn,
    });

    // THEN setup is called exactly once (suite-level)
    expect(givenSetupFn).toHaveBeenCalledTimes(1);
    // AND teardown is called exactly once (suite-level)
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
  });

  test("should call async setupEach and teardownEach for each iteration when both are provided", async () => {
    // GIVEN a promise with per-iteration async hooks and 3 iterations
    const givenDuration = 10;
    const givenIterations = 3;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupEachFn = jest.fn();
    const givenTeardownEachFn = jest.fn();

    // WHEN asserting toResolveWithinQuantile with setupEach and teardownEach
    await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50,
      setupEach: givenSetupEachFn, teardownEach: givenTeardownEachFn,
    });

    // THEN setupEach is called once per iteration
    expect(givenSetupEachFn).toHaveBeenCalledTimes(givenIterations);
    // AND teardownEach is called once per iteration
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(givenIterations);
  });

  test("should call async setupEach and teardownEach during warmup when warmup is configured", async () => {
    // GIVEN a promise with per-iteration hooks, 3 measured iterations and 2 warmup iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenWarmup = 2;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSetupEachFn = jest.fn();
    const givenTeardownEachFn = jest.fn();

    // WHEN asserting toResolveWithinQuantile with warmup
    await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50, warmup: givenWarmup,
      setupEach: givenSetupEachFn, teardownEach: givenTeardownEachFn,
    });

    // THEN setupEach is called for warmup + measured = total times
    expect(givenSetupEachFn).toHaveBeenCalledTimes(givenWarmup + givenIterations);
    // AND teardownEach is called the same number of times
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(givenWarmup + givenIterations);
  });

  test("should await async setup that returns a Promise when setup is async", async () => {
    // GIVEN a promise with an async setup hook
    const givenDuration = 10;
    const givenIterations = 3;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const actualOrder: string[] = [];

    // WHEN asserting toResolveWithinQuantile with async setup
    await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50,
      setup: async () => {
        actualOrder.push('setup-done');
      },
    });

    // THEN setup is awaited and called once
    expect(actualOrder).toEqual(['setup-done']);
  });

  test("should propagate async setup rejection immediately when setup rejects", async () => {
    // GIVEN a promise with an async setup hook that rejects
    const givenDuration = 10;
    const givenIterations = 3;
    const givenSetupError = "foo-async-setup-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN async setup rejects,
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        setup: async () => {
          throw new Error(givenSetupError);
        },
      })
    ).rejects.toThrowError(givenSetupError);
  });

  test("should propagate async teardown rejection immediately when teardown rejects", async () => {
    // GIVEN a promise with an async teardown hook that rejects
    const givenDuration = 10;
    const givenIterations = 3;
    const givenTeardownError = "foo-async-teardown-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN async teardown rejects
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        teardown: async () => {
          throw new Error(givenTeardownError);
        },
      })
    ).rejects.toThrowError(givenTeardownError);
  });

  test("should propagate async setupEach rejection immediately when setupEach rejects", async () => {
    // GIVEN a promise with an async setupEach hook that rejects
    const givenDuration = 10;
    const givenIterations = 3;
    const givenSetupEachError = "foo-async-setupEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN async setupEach rejects,
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        setupEach: async () => {
          throw new Error(givenSetupEachError);
        },
      })
    ).rejects.toThrowError(givenSetupEachError);
  });

  test("should still call teardown when async setupEach rejects", async () => {
    // GIVEN a promise with async setupEach that rejects and a suite-level teardown
    const givenDuration = 10;
    const givenIterations = 3;
    const givenSuiteState = "foo-async-suite";
    const givenSetupEachError = "foo-async-setupEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenTeardownFn = jest.fn();

    // WHEN async setupEach rejects on the first iteration
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        setup: async () => givenSuiteState,
        setupEach: async () => {
          throw new Error(givenSetupEachError);
        },
        teardown: givenTeardownFn,
      })
    ).rejects.toThrowError(givenSetupEachError);

    // THEN teardown is still called via outer try/finally
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the suite state
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSuiteState);
  });

  test("should propagate async teardownEach rejection immediately when teardownEach rejects", async () => {
    // GIVEN a promise with an async teardownEach hook that rejects
    const givenDuration = 10;
    const givenIterations = 3;
    const givenTeardownEachError = "foo-async-teardownEach-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN async teardownEach rejects
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        teardownEach: async () => {
          throw new Error(givenTeardownEachError);
        },
      })
    ).rejects.toThrowError(givenTeardownEachError);
  });

  test("should still call teardown and teardownEach when promise rejects", async () => {
    // GIVEN a promise that rejects on the first iteration, with suite teardown and per-iteration teardownEach
    const givenDuration = 10;
    const givenIterations = 3;
    const givenSuiteState = "foo-async-suite";
    const givenPromiseError = "foo-promise-error";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenTeardownFn = jest.fn();
    const givenTeardownEachFn = jest.fn();

    // WHEN the promise rejects on the first iteration
    await expect(
      expect(async () => {
        throw new Error(givenPromiseError);
      }).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        setup: async () => givenSuiteState,
        teardown: givenTeardownFn,
        teardownEach: givenTeardownEachFn,
      })
    ).rejects.toThrowError(givenPromiseError);

    // THEN teardownEach is called once (for the failing iteration)
    expect(givenTeardownEachFn).toHaveBeenCalledTimes(1);
    // AND teardown is still called once with the suite state
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSuiteState);
  });

  test("should throw validation error when setupEach is not a function", async () => {
    // GIVEN an invalid setupEach value that is not a function
    const givenInvalidSetupEach = 42;

    // WHEN asserting toResolveWithinQuantile with the invalid setupEach,
    // THEN a validation error is thrown
    await expect(async () => {
      await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
        iterations: 3,
        quantile: 50,
        // @ts-expect-error - intentionally passing invalid setupEach for testing
        setupEach: givenInvalidSetupEach
      });
    }).rejects.toThrowError("jest-performance-matchers: setupEach must be a function if provided, received number");
  });

  test("should throw validation error when teardownEach is not a function", async () => {
    // GIVEN an invalid teardownEach value that is not a function
    const givenInvalidTeardownEach = "foo-not-a-function";

    // WHEN asserting toResolveWithinQuantile with the invalid teardownEach,
    // THEN a validation error is thrown
    await expect(async () => {
      await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
        iterations: 3,
        quantile: 50,
        // @ts-expect-error - intentionally passing invalid teardownEach for testing
        teardownEach: givenInvalidTeardownEach
      });
    }).rejects.toThrowError("jest-performance-matchers: teardownEach must be a function if provided, received string");
  });

  test("should show 'setup/teardown active' hint in async .not negation message when setup is provided", async () => {
    // GIVEN a promise that completes within the budget with a setup hook
    const givenDuration = 10;
    const givenIterations = 5;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN using .not negation (expecting the assertion to fail)
    // THEN the error message includes the 'setup/teardown active' hint
    await expect(async () => {
      await expect(async () => await Promise.resolve()).not.toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations, quantile: 50,
        setup: () => { /* noop */
        },
      });
    }).rejects.toThrowError(/setup\/teardown active/);
  });

  test("should show 'setup/teardown active' hint in async failure message when setup is provided", async () => {
    // GIVEN a promise that exceeds the budget with a setup hook
    const givenDuration = 10;
    const givenIterations = 5;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN the assertion fails
    let actualMessage = '';
    try {
      await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration - 1, {
        iterations: givenIterations, quantile: 50,
        setup: () => { /* noop */
        },
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the stats-block includes the 'setup/teardown active' hint
    expect(actualMessage).toContain('setup/teardown active');
  });

  test("should pass async setup and setupEach return values to callback and teardownEach when all hooks are provided", async () => {
    // GIVEN a promise with all four async hooks that return and receive values
    const givenDuration = 10;
    const givenIterations = 2;
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    const givenSuiteData = "foo-async-suite";
    let givenIterCounter = 0;
    const actualCallbackArgs: unknown[][] = [];
    const actualTeardownEachArgs: unknown[][] = [];
    let actualTeardownArg: unknown;

    // WHEN asserting toResolveWithinQuantile with all four hooks
    await expect(async (suiteState: unknown, iterState: unknown) => {
      actualCallbackArgs.push([suiteState, iterState]);
    }).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50,
      setup: async () => givenSuiteData,
      setupEach: async (_suiteState) => {
        return ++givenIterCounter;
      },
      teardownEach: (suiteState, iterState) => {
        actualTeardownEachArgs.push([suiteState, iterState]);
      },
      teardown: (suiteState) => {
        actualTeardownArg = suiteState;
      },
    });

    // THEN callback receives both suite state and iter state
    expect(actualCallbackArgs).toEqual([[givenSuiteData, 1], [givenSuiteData, 2]]);
    // AND teardownEach receives both
    expect(actualTeardownEachArgs).toEqual([[givenSuiteData, 1], [givenSuiteData, 2]]);
    // AND teardown receives suite state only
    expect(actualTeardownArg).toBe(givenSuiteData);
  });

  test("should pass async setup return value during warmup iterations when warmup is configured", async () => {
    // GIVEN a promise with async suite-level setup and per-iteration setupEach, with warmup
    const givenDuration = 10;
    const givenIterations = 2;
    const givenWarmup = 2;
    const givenSuiteState = "foo-async-suite";
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));
    let givenIterCounter = 0;
    const actualCallbackArgs: unknown[][] = [];

    // WHEN asserting toResolveWithinQuantile with warmup
    await expect(async (suiteState: unknown, iterState: unknown) => {
      actualCallbackArgs.push([suiteState, iterState]);
    }).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations, quantile: 50, warmup: givenWarmup,
      setup: async () => givenSuiteState,
      setupEach: async () => ++givenIterCounter,
    });

    // THEN warmup (2) + measured (2) = 4 calls, all receive suite state and fresh iter state
    expect(actualCallbackArgs).toEqual([
      [givenSuiteState, 1], [givenSuiteState, 2], [givenSuiteState, 3], [givenSuiteState, 4],
    ]);
  });

});

describe("Error rate tolerance (sync)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should pass the assertion when error rate is within tolerance", () => {
    // GIVEN a callback that fails 3 of 10 iterations
    const givenIterations = 10;
    const givenAllowedErrorRate = 0.5;
    const givenFailCount = 3;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN asserting with allowedErrorRate above the actual failure rate,
    // THEN the assertion passes (30% < 50%)
    expect((..._args: unknown[]) => {
      callCount++;
      if (callCount <= givenFailCount) throw new Error("foo-transient-error");
    }).toCompleteWithinQuantile(10, {
      iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
    });
  });

  test("should fail the assertion when error rate exceeds tolerance", () => {
    // GIVEN a callback that fails 6 of 10 iterations
    const givenIterations = 10;
    const givenAllowedErrorRate = 0.3;
    const givenFailCount = 6;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN asserting with allowedErrorRate below the actual failure rate,
    // THEN the assertion fails with a descriptive error rate message
    expect(() => {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
      });
    }).toThrowError(/error rate 6\/10 \(60\.0%\) exceeds allowed 30\.0%/);
  });

  test("should propagate error immediately when allowedErrorRate is not set (default 0)", () => {
    // GIVEN a callback that always throws and no allowedErrorRate option
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-callback-error");

    // WHEN the callback throws during iteration,
    // THEN the error propagates immediately (backward compatible)
    expect(() => {
      expect((..._args: unknown[]) => {
        throw givenError;
      }).toCompleteWithinQuantile(10, {
        iterations: 10, quantile: 50,
      });
    }).toThrowError(givenError.message);
  });

  test("should propagate error immediately when allowedErrorRate is explicitly 0", () => {
    // GIVEN a callback that always throws with allowedErrorRate explicitly set to 0
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-callback-error");

    // WHEN the callback throws during iteration,
    // THEN the error propagates immediately (same as default)
    expect(() => {
      expect((..._args: unknown[]) => {
        throw givenError;
      }).toCompleteWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0,
      });
    }).toThrowError(givenError.message);
  });

  test("should fail with all-failed message when every iteration throws", () => {
    // GIVEN a callback that always throws with maximum error tolerance
    const givenIterations = 5;
    const givenAllowedErrorRate = 1.0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN all iterations fail
    // THEN the matcher fails with a descriptive all-failed message
    expect(() => {
      expect((..._args: unknown[]) => {
        throw new Error("foo-always-fails");
      }).toCompleteWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
      });
    }).toThrowError(/all 5 iterations failed \(100% error rate, allowed 100\.0%\)/);
  });

  test("should call teardown when all iterations fail", () => {
    // GIVEN a callback that always throws and a teardown spy
    const givenIterations = 5;
    const givenSetupState = "foo-suite-state";
    mockFunctionProcessTimes(Array(givenIterations).fill(10));
    const givenTeardown = jest.fn();

    // WHEN all iterations fail
    expect(() => {
      expect((..._args: unknown[]) => {
        throw new Error("foo-always-fails");
      }).toCompleteWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 1.0,
        setup: () => givenSetupState,
        teardown: givenTeardown,
      });
    }).toThrowError(/all 5 iterations failed/);

    // THEN teardown is still called with the setup state
    expect(givenTeardown).toHaveBeenCalledTimes(1);
    expect(givenTeardown).toHaveBeenCalledWith(givenSetupState);
  });

  test("should call teardown when error rate is exceeded", () => {
    // GIVEN a callback that fails 6 of 10 iterations and a teardown spy
    const givenIterations = 10;
    const givenFailCount = 6;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));
    const givenTeardown = jest.fn();

    // WHEN the error rate exceeds the threshold
    expect(() => {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 0.3,
        setup: () => "foo-state",
        teardown: givenTeardown,
      });
    }).toThrowError(/error rate/);

    // THEN teardown is still called
    expect(givenTeardown).toHaveBeenCalledTimes(1);
  });

  test("should propagate setupEach error as fatal when allowedErrorRate is set", () => {
    // GIVEN a setupEach that throws with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-setupEach-error");

    // WHEN setupEach throws,
    // THEN the error propagates immediately (not counted toward error rate)
    expect(() => {
      expect((..._args: unknown[]) => undefined).toCompleteWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0.5,
        setupEach: () => {
          throw givenError;
        },
      });
    }).toThrowError(givenError.message);
  });

  test("should propagate teardownEach error as fatal when allowedErrorRate is set", () => {
    // GIVEN a teardownEach that throws with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-teardownEach-error");

    // WHEN teardownEach throws,
    // THEN the error propagates immediately (not counted toward error rate)
    expect(() => {
      expect((..._args: unknown[]) => undefined).toCompleteWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0.5,
        teardownEach: () => {
          throw givenError;
        },
      });
    }).toThrowError(givenError.message);
  });

  test("should include error rate line in diagnostics when errors occur within tolerance", () => {
    // GIVEN a callback that fails 2 of 10 iterations within tolerance
    const givenIterations = 10;
    const givenFailCount = 2;
    const givenAllowedErrorRate = 0.5;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN the quantile matcher fails (duration exceeds threshold)
    let actualMessage = '';
    try {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(5, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the error rate line appears in the diagnostics
    const expectedErrorRateLine = 'Error rate: 2/10 (20.0%) [within 50.0% tolerance]';
    expect(actualMessage).toContain(expectedErrorRateLine);
  });

  test("should not include error rate line when no errors occur with allowedErrorRate set", () => {
    // GIVEN a callback that never throws with allowedErrorRate set
    mockFunctionProcessTimes(Array(5).fill(10));

    // WHEN the assertion passes with no errors
    let actualMessage = '';
    try {
      expect((..._args: unknown[]) => undefined).toCompleteWithinQuantile(5, {
        iterations: 5, quantile: 50, allowedErrorRate: 0.1,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN no error rate line appears
    expect(actualMessage).not.toContain('Error rate:');
  });

  test("should note excluded runs in interpretation when errors occur", () => {
    // GIVEN a callback that fails 2 of 10 iterations
    const givenIterations = 10;
    const givenFailCount = 2;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN the quantile matcher produces diagnostics
    let actualMessage = '';
    try {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(5, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 0.5,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the interpretation notes the excluded runs
    expect(actualMessage).toContain(`${givenFailCount} of ${givenIterations} iterations were excluded due to errors`);
  });

  test("should compute stats on successful runs only when errors reduce n", () => {
    // GIVEN a callback that fails 2 of 5 iterations
    const givenIterations = 5;
    const givenFailCount = 2;
    const expectedSuccessfulN = givenIterations - givenFailCount;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN the quantile matcher produces diagnostics
    let actualMessage = '';
    try {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(5, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 0.5,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN stats reflect only successful runs
    expect(actualMessage).toContain(`Statistics (n=${expectedSuccessfulN}`);
  });

  test("should fail when all successful iterations are removed as outliers after error exclusion", () => {
    // GIVEN a callback that fails 5 of 10 iterations and removeOutliers returns empty
    const givenIterations = 10;
    const givenFailCount = 5;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));
    jest.spyOn(metrics, 'removeOutliers').mockReturnValue([]);

    // WHEN outlier removal empties the remaining durations,
    // THEN the matcher fails with a descriptive message
    expect(() => {
      expect((..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toCompleteWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 0.6, outliers: 'remove',
      });
    }).toThrowError(/all \d+ successful iterations were removed as outliers/);
  });

  test("should propagate warmup error as fatal when allowedErrorRate is set", () => {
    // GIVEN a callback that throws during warmup with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-warmup-error");
    let givenWarmupDone = false;

    // WHEN the callback throws during warmup,
    // THEN the error propagates immediately (warmup errors are always fatal)
    expect(() => {
      expect((..._args: unknown[]) => {
        if (!givenWarmupDone) throw givenError;
      }).toCompleteWithinQuantile(10, {
        iterations: 5, quantile: 50, warmup: 1, allowedErrorRate: 0.5,
      });
    }).toThrowError(givenError.message);
  });
});

describe("Error rate tolerance (async)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should pass the assertion when error rate is within tolerance", async () => {
    // GIVEN an async callback that fails 3 of 10 iterations
    const givenIterations = 10;
    const givenAllowedErrorRate = 0.5;
    const givenFailCount = 3;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN asserting with allowedErrorRate above the actual failure rate,
    // THEN the assertion passes
    await expect(async (..._args: unknown[]) => {
      callCount++;
      if (callCount <= givenFailCount) throw new Error("foo-transient-error");
    }).toResolveWithinQuantile(10, {
      iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
    });
  });

  test("should fail the assertion when error rate exceeds tolerance", async () => {
    // GIVEN an async callback that fails 6 of 10 iterations
    const givenIterations = 10;
    const givenAllowedErrorRate = 0.3;
    const givenFailCount = 6;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN asserting with allowedErrorRate below the actual failure rate
    let actualMessage = '';
    try {
      await expect(async (..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toResolveWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: givenAllowedErrorRate,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the failure message contains the error rate
    expect(actualMessage).toContain(`error rate ${givenFailCount}/${givenIterations} (60.0%) exceeds allowed 30.0%`);
  });

  test("should propagate error immediately when allowedErrorRate is not set (default 0)", async () => {
    // GIVEN an async callback that always throws and no allowedErrorRate option
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-async-callback-error");

    // WHEN the callback throws during iteration,
    // THEN the error propagates immediately
    await expect(
      expect(async (..._args: unknown[]) => {
        throw givenError;
      }).toResolveWithinQuantile(10, {
        iterations: 10, quantile: 50,
      })
    ).rejects.toThrowError(givenError.message);
  });

  test("should fail with all-failed message when every iteration throws", async () => {
    // GIVEN an async callback that always throws with maximum error tolerance
    const givenIterations = 5;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));

    // WHEN all iterations fail
    let actualMessage = '';
    try {
      await expect(async (..._args: unknown[]) => {
        throw new Error("foo-always-fails");
      }).toResolveWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 1.0,
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the failure message indicates all iterations failed
    expect(actualMessage).toContain(`all ${givenIterations} iterations failed`);
  });

  test("should fail when all successful iterations are removed as outliers after error exclusion", async () => {
    // GIVEN an async callback that fails 5 of 10 iterations and removeOutliers returns empty
    const givenIterations = 10;
    const givenFailCount = 5;
    let callCount = 0;
    mockFunctionProcessTimes(Array(givenIterations).fill(10));
    jest.spyOn(metrics, 'removeOutliers').mockReturnValue([]);

    // WHEN outlier removal empties the remaining durations
    let actualMessage = '';
    try {
      await expect(async (..._args: unknown[]) => {
        callCount++;
        if (callCount <= givenFailCount) throw new Error("foo-transient-error");
      }).toResolveWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 0.6, outliers: 'remove',
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the matcher fails with a descriptive message
    expect(actualMessage).toContain('successful iterations were removed as outliers');
  });

  test("should call teardown when all iterations fail", async () => {
    // GIVEN an async callback that always throws and a teardown spy
    const givenIterations = 5;
    const givenSetupState = "foo-suite-state";
    mockFunctionProcessTimes(Array(givenIterations).fill(10));
    const givenTeardown = jest.fn();

    // WHEN all iterations fail
    try {
      await expect(async (..._args: unknown[]) => {
        throw new Error("foo-always-fails");
      }).toResolveWithinQuantile(10, {
        iterations: givenIterations, quantile: 50, allowedErrorRate: 1.0,
        setup: () => givenSetupState,
        teardown: givenTeardown,
      });
    } catch {
      // expected
    }

    // THEN teardown is still called with the setup state
    expect(givenTeardown).toHaveBeenCalledTimes(1);
    expect(givenTeardown).toHaveBeenCalledWith(givenSetupState);
  });

  test("should propagate setupEach error as fatal when allowedErrorRate is set", async () => {
    // GIVEN an async setupEach that rejects with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-async-setupEach-error");

    // WHEN setupEach rejects
    // THEN the error propagates immediately (not counted toward error rate)
    await expect(
      expect(async (..._args: unknown[]) => undefined).toResolveWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0.5,
        setupEach: async () => {
          throw givenError;
        },
      })
    ).rejects.toThrowError(givenError.message);
  });

  test("should propagate teardownEach error as fatal when allowedErrorRate is set", async () => {
    // GIVEN an async teardownEach that rejects with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-async-teardownEach-error");

    // WHEN teardownEach rejects,
    // THEN the error propagates immediately (not counted toward error rate)
    await expect(
      expect(async (..._args: unknown[]) => undefined).toResolveWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0.5,
        teardownEach: async () => {
          throw givenError;
        },
      })
    ).rejects.toThrowError(givenError.message);
  });

  test("should propagate warmup error as fatal when allowedErrorRate is set", async () => {
    // GIVEN an async callback that throws during warmup with error tolerance enabled
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-async-warmup-error");
    let givenWarmupDone = false;

    // WHEN the callback throws during warmup,
    // THEN the error propagates immediately (warmup errors are always fatal)
    await expect(
      expect(async (..._args: unknown[]) => {
        if (!givenWarmupDone) throw givenError;
      }).toResolveWithinQuantile(10, {
        iterations: 5, quantile: 50, warmup: 1, allowedErrorRate: 0.5,
      })
    ).rejects.toThrowError(givenError.message);
  });

  test("should propagate error immediately when allowedErrorRate is explicitly 0", async () => {
    // GIVEN an async callback that always throws with allowedErrorRate explicitly set to 0
    mockFunctionProcessTimes(Array(10).fill(10));
    const givenError = new Error("foo-async-callback-error");

    // WHEN the callback throws during iteration,
    // THEN the error propagates immediately (same as default)
    await expect(
      expect(async (..._args: unknown[]) => {
        throw givenError;
      }).toResolveWithinQuantile(10, {
        iterations: 10, quantile: 50, allowedErrorRate: 0,
      })
    ).rejects.toThrowError(givenError.message);
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
    // GIVEN 31 identical durations, producing GOOD RME and GOOD CV
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
    // GIVEN a benchmark with FAIR RME and FAIR CV
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

  test("should interpret as outlier-driven variance when RME is FAIR, CV is POOR, and MAD is LOW", () => {
    // GIVEN a benchmark with FAIR RME, POOR CV, and low MAD dispersion
    // MAD=1, median=10 → normalized=0.1 → FAIR (not POOR) → outlier branch
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

    // THEN the interpretation identifies outliers as the cause
    expect(actualMessage).toContain('outliers are inflating variance');
    expect(actualMessage).toContain('outlier removal');
  });

  test("should interpret as outlier-driven variance when RME is GOOD, CV is POOR, and MAD is LOW", () => {
    // GIVEN a benchmark with GOOD RME, POOR CV, and low MAD dispersion
    // All identical → MAD=0, median=10, normalized=0 → GOOD → outlier branch
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

    // THEN the interpretation identifies outliers as the cause
    expect(actualMessage).toContain('outliers are inflating variance');
    expect(actualMessage).toContain('outlier removal');
  });

  test("should interpret as reliable when RME is GOOD and CV is FAIR", () => {
    // GIVEN a benchmark with GOOD RME and FAIR CV
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
    // GIVEN 5 high-variance durations, producing POOR RME and POOR sample adequacy
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
    // GIVEN a benchmark with POOR RME and POOR CV
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
    // GIVEN a benchmark where the confidence interval straddles the threshold
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

    // WHEN the quantile assertion fails because the measured quantile exceeds the threshold
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {
        iterations: givenDurations.length,
        quantile: 1
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the interpretation notes the CI upper bound exceeds the budget
    const expectedUpperBound = formatMs(givenCIUpper);
    expect(actualMessage).toContain(`CI upper bound (${expectedUpperBound}ms) exceeds your ${givenThreshold}ms threshold`);
    expect(actualMessage).toContain('consider optimizing the code or raising the threshold');
  });

  test("should note CI is safely within budget when upper bound is below threshold", () => {
    // GIVEN 31 identical durations (mean=10, CI≈[10,10]) and a generous threshold of 100ms
    const givenDurations = Array(31).fill(10);
    mockFunctionProcessTimes(givenDurations);
    const givenThreshold = 100;

    // WHEN .not negation fails because the function is actually within the threshold
    let actualMessage = '';
    try {
      expect(() => undefined).not.toCompleteWithinQuantile(givenThreshold, {
        iterations: givenDurations.length,
        quantile: 1
      });
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
      expect(() => undefined).toCompleteWithinQuantile(givenThreshold, {
        iterations: givenDurations.length,
        quantile: 1
      });
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN the interpretation flags the code as almost certainly too slow
    expect(actualMessage).toContain(`entirely above your ${givenThreshold}ms threshold`);
    expect(actualMessage).toContain('almost certainly too slow');
  });

  test("should show no tags when CI is null (n=1)", () => {
    // GIVEN a single duration, producing null CI, RME, and CV
    const givenDurations = [10];

    // WHEN the quantile matcher fails
    const actualMessage = getFailureMessage(givenDurations);

    // THEN no classification tags appear, and interpretation says unreliable
    expect(actualMessage).toContain('Confidence Interval (CI): N/A (insufficient data)');
    expect(actualMessage).not.toContain('[GOOD');
    expect(actualMessage).not.toContain('[FAIR');
    expect(actualMessage).not.toContain('[POOR');
    expect(actualMessage).toContain('Relative Margin of Error (RME): N/A');
    expect(actualMessage).toContain('Coefficient of Variation (CV): N/A');
    expect(actualMessage).toContain('Median Absolute Deviation (MAD): N/A');
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
    // GIVEN a benchmark with mean equal to zero (RME and CV cannot be computed)
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

  test("should show MAD value without classification tag when median is zero", () => {
    // GIVEN a benchmark with median equal to zero (MAD classification unavailable)
    const givenDurations = [8, 9, 10, 11, 12];
    mockFunctionProcessTimes(givenDurations);

    const givenStats = metrics.calcStats(givenDurations);
    jest.spyOn(metrics, 'calcStats').mockReturnValue({
      ...givenStats,
      median: 0,
    });

    // WHEN the quantile matcher fails
    let actualMessage = '';
    try {
      expect(() => undefined).toCompleteWithinQuantile(0.001, {iterations: givenDurations.length, quantile: 1});
    } catch (e) {
      actualMessage = (e as Error).message;
    }

    // THEN MAD value is shown but without a classification tag
    expect(actualMessage).toContain('Median Absolute Deviation (MAD): 1.00ms');
    expect(actualMessage).not.toMatch(/Median Absolute Deviation \(MAD\): [\d.]+ms \[/);
  });
});

describe("Test jest expect.toResolveWithinQuantile assertion", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  })

  test("Should pass the assertion (async)", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting that it resolves within the threshold at the given quantile
    const givenQuantile = 1
    // THEN expect success
    await expect(async () => await Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: givenQuantile
    });
  });

  test("Should pass the assertion (promise)", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    mockFunctionProcessTimes(Array(givenIterations).fill(givenDuration));

    // WHEN asserting that it resolves within the threshold at the given quantile
    const givenQuantile = 1
    // THEN expect success
    await expect(() => Promise.resolve()).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: givenQuantile
    });
  });

  test("Should fail the assertion", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) - 1 milliseconds
    // THEN expect to fail
    const givenQuantile = 1;
    const expectedStatsBlock = buildStatsBlock(givenDurations, givenDuration - 1);
    await expect(async () => {
      await expect(() => Promise.resolve()).toResolveWithinQuantile(givenDuration - 1, {
        iterations: givenIterations,
        quantile: givenQuantile
      });
    }).rejects.toThrowError(`expected that ${givenQuantile}% of the time when running ${givenIterations} iterations,\nthe function duration to be less or equal to ${printExpected(givenDuration - 1)} (ms),\ninstead it was ${printReceived(givenDuration)} (ms)\n\n${expectedStatsBlock}`);
  });

  test("Should not to pass the assertion", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will not resolve in (T) milliseconds
    // THEN expect to fail
    const givenQuantile = 1;
    const expectedStatsBlock = buildStatsBlock(givenDurations, givenDuration);
    await expect(async () => {
      await expect(() => Promise.resolve()).not.toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations,
        quantile: givenQuantile
      });
    }).rejects.toThrowError(`expected that ${givenQuantile}% of the time when running ${givenIterations} iterations,\nthe function duration to be greater than ${printExpected(givenDuration)} (ms),\ninstead it was ${printReceived(givenDuration)} (ms)\n\n${expectedStatsBlock}`);
  });

  test("Should fail the assertion if the promise is rejected", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);

    // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) - 1 milliseconds
    // AND the promise rejects
    // THEN expect to fail
    const givenQuantile = 1
    await expect(async () => {
      await expect(() => Promise.reject("Rejected for some reason")).toResolveWithinQuantile(givenDuration, {
        iterations: givenIterations,
        quantile: givenQuantile
      });
    }).rejects.toEqual("Rejected for some reason");
  });

  test("Should base calculations of the the expected quantile based on the iterations arguments", async () => {
    // GIVEN an async function that resolves within the given duration over multiple iterations
    const givenDuration = 10;
    const givenIterations = 5
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(givenDurations);
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting toResolveWithinQuantile(givenDuration,I,Q)
    const givenQuantile = 1;
    jest.spyOn(metrics, 'calcQuantile')
    // THEN the function is called once per measured iteration
    await expect(mockFn).toResolveWithinQuantile(givenDuration, {iterations: givenIterations, quantile: givenQuantile});
    expect(mockFn).toBeCalledTimes(givenIterations);
    // AND the quantile is computed from the measured durations
    expect(metrics.calcQuantile).toHaveBeenCalledWith(givenQuantile, givenDurations);
  });

  test("Should run warmup iterations before measured iterations", async () => {
    // GIVEN a promise with warmup and measured iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenWarmup = 2;
    mockFunctionProcessTimes(Array(givenWarmup + givenIterations).fill(givenDuration));
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting with warmup
    await expect(mockFn).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: 1,
      warmup: givenWarmup
    });

    // THEN expect the callback to have been called warmup + iterations times
    expect(mockFn).toBeCalledTimes(givenWarmup + givenIterations);
  });

  test("Should only include measured iterations in durations when warmup is used", async () => {
    // GIVEN a promise with warmup iterations
    const givenDuration = 10;
    const givenIterations = 3;
    const givenWarmup = 2;
    const givenDurations = Array(givenIterations).fill(givenDuration);
    mockFunctionProcessTimes(Array(givenWarmup + givenIterations).fill(givenDuration));
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting with warmup
    jest.spyOn(metrics, 'calcQuantile');
    await expect(mockFn).toResolveWithinQuantile(givenDuration, {
      iterations: givenIterations,
      quantile: 1,
      warmup: givenWarmup
    });

    // THEN only measured iterations are passed to calcQuantile
    expect(metrics.calcQuantile).toHaveBeenCalledWith(1, givenDurations);
  });

  test("Should remove outliers when outliers option is 'remove'", async () => {
    // GIVEN a promise with some outlier durations
    const givenIterations = 6;
    const durations = [10, 11, 12, 10, 11, 100];
    mockFunctionProcessTimes(durations);
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting with outliers: 'remove'
    jest.spyOn(metrics, 'removeOutliers');
    await expect(mockFn).toResolveWithinQuantile(15, {iterations: givenIterations, quantile: 95, outliers: 'remove'});

    // THEN removeOutliers should be called with the durations
    expect(metrics.removeOutliers).toHaveBeenCalledWith(durations);
  });

  test("Should keep outliers by default", async () => {
    // GIVEN a promise with durations
    const givenIterations = 5;
    const givenDurations = Array(givenIterations).fill(10);
    mockFunctionProcessTimes(givenDurations);
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting without outliers option
    jest.spyOn(metrics, 'removeOutliers');
    await expect(mockFn).toResolveWithinQuantile(15, {iterations: givenIterations, quantile: 95});

    // THEN removeOutliers should not be called
    expect(metrics.removeOutliers).not.toHaveBeenCalled();
  });

  test("Should show Shape line in async failure message", async () => {
    // GIVEN a promise with varying durations
    const durations = [5, 10, 15, 20, 25];
    const givenIterations = durations.length;
    mockFunctionProcessTimes(durations);

    // WHEN asserting and it fails
    let errorMessage = '';
    try {
      await expect(() => Promise.resolve()).toResolveWithinQuantile(1, {iterations: givenIterations, quantile: 1});
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    // THEN the message should contain the Shape line
    // eslint-disable-next-line no-console
    console.log(`\n--- Async failure message (symmetric, n=${givenIterations}) ---\n${errorMessage}\n`);
    expect(errorMessage).toContain('Shape:');
    expect(errorMessage).toContain('skewness=');
  });
});

