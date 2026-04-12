import {
  classifyRME, classifyCV, classifyMAD, classifySampleAdequacy,
  generateInterpretation, generateComparisonInterpretation, generateThroughputInterpretation,
  hasWarningConditions, formatTag, Tag
} from '../src/diagnostics';
import {formatMs} from '../src/format';
import {Stats, WelchTTestResult} from '../src/metrics';

describe("formatTag", () => {
  test("should combine label and range into a display string", () => {
    // GIVEN a tag with label and range
    const givenTag: Tag = {label: 'GOOD', range: '<10%'};

    // WHEN formatting the tag
    const actualResult = formatTag(givenTag);

    // THEN the output combines both parts
    expect(actualResult).toBe(`${givenTag.label} ${givenTag.range}`);
  });
});

describe("classifyRME", () => {
  test("should return null when RME is null", () => {
    // GIVEN a null RME value
    const givenRME = null;

    // WHEN classifying
    const actualResult = classifyRME(givenRME);

    // THEN the result is null
    expect(actualResult).toBeNull();
  });

  test("should return GOOD when RME is below 10%", () => {
    // GIVEN an RME below the GOOD threshold
    const givenRME = 9.99;

    // WHEN classifying
    const actualResult = classifyRME(givenRME);

    // THEN the label is GOOD with <10% range
    expect(actualResult).toEqual({label: 'GOOD', range: '<10%'});
  });

  test("should return FAIR when RME is exactly 10%", () => {
    // GIVEN an RME at the FAIR boundary
    const givenRME = 10;

    // WHEN classifying
    const actualResult = classifyRME(givenRME);

    // THEN the label is FAIR
    expect(actualResult!.label).toBe('FAIR');
  });

  test("should return FAIR when RME is 30%", () => {
    // GIVEN an RME at the upper FAIR boundary
    const givenRME = 30;

    // WHEN classifying
    const actualResult = classifyRME(givenRME);

    // THEN the label is still FAIR (inclusive)
    expect(actualResult).toEqual({label: 'FAIR', range: '10-30%'});
  });

  test("should return POOR when RME exceeds 30%", () => {
    // GIVEN an RME above the POOR threshold
    const givenRME = 30.01;

    // WHEN classifying
    const actualResult = classifyRME(givenRME);

    // THEN the label is POOR
    expect(actualResult).toEqual({label: 'POOR', range: '>30%'});
  });
});

describe("classifyCV", () => {
  test("should return null when CV is null", () => {
    // GIVEN a null CV value
    const givenCV = null;

    // WHEN classifying
    const actualResult = classifyCV(givenCV);

    // THEN the result is null
    expect(actualResult).toBeNull();
  });

  test("should return GOOD when CV is below 0.1", () => {
    // GIVEN a CV below the GOOD threshold
    const givenCV = 0.09;

    // WHEN classifying
    const actualResult = classifyCV(givenCV);

    // THEN the label is GOOD
    expect(actualResult).toEqual({label: 'GOOD', range: '<0.1'});
  });

  test("should return FAIR when CV is exactly 0.1", () => {
    // GIVEN a CV at the FAIR boundary
    const givenCV = 0.1;

    // WHEN classifying
    const actualResult = classifyCV(givenCV);

    // THEN the label is FAIR
    expect(actualResult!.label).toBe('FAIR');
  });

  test("should return FAIR when CV is 0.3", () => {
    // GIVEN a CV at the upper FAIR boundary
    const givenCV = 0.3;

    // WHEN classifying
    const actualResult = classifyCV(givenCV);

    // THEN the label is still FAIR (inclusive)
    expect(actualResult).toEqual({label: 'FAIR', range: '0.1-0.3'});
  });

  test("should return POOR when CV exceeds 0.3", () => {
    // GIVEN a CV above the POOR threshold
    const givenCV = 0.31;

    // WHEN classifying
    const actualResult = classifyCV(givenCV);

    // THEN the label is POOR
    expect(actualResult).toEqual({label: 'POOR', range: '>0.3'});
  });
});

describe("classifySampleAdequacy", () => {
  test("should return POOR when n is below 10", () => {
    // GIVEN a sample size below the POOR threshold
    const givenN = 5;

    // WHEN classifying
    const actualResult = classifySampleAdequacy(givenN);

    // THEN the label is POOR
    expect(actualResult).toEqual({label: 'POOR', range: '<10'});
  });

  test("should return FAIR when n is exactly 10", () => {
    // GIVEN a sample size at the FAIR boundary
    const givenN = 10;

    // WHEN classifying
    const actualResult = classifySampleAdequacy(givenN);

    // THEN the label is FAIR
    expect(actualResult).toEqual({label: 'FAIR', range: '10-30'});
  });

  test("should return FAIR when n is 30", () => {
    // GIVEN a sample size at the upper FAIR boundary
    const givenN = 30;

    // WHEN classifying
    const actualResult = classifySampleAdequacy(givenN);

    // THEN the label is still FAIR (inclusive)
    expect(actualResult).toEqual({label: 'FAIR', range: '10-30'});
  });

  test("should return GOOD when n exceeds 30", () => {
    // GIVEN a sample size above the GOOD threshold
    const givenN = 31;

    // WHEN classifying
    const actualResult = classifySampleAdequacy(givenN);

    // THEN the label is GOOD
    expect(actualResult).toEqual({label: 'GOOD', range: '>30'});
  });
});

describe("classifyMAD", () => {
  test("should return null when MAD is null", () => {
    // GIVEN a null MAD value
    const actualResult = classifyMAD(null, 10);

    // THEN the result is null
    expect(actualResult).toBeNull();
  });

  test("should return null when median is null", () => {
    // GIVEN a null median
    const actualResult = classifyMAD(1, null);

    // THEN the result is null
    expect(actualResult).toBeNull();
  });

  test("should return null when median is zero", () => {
    // GIVEN a zero median (division undefined)
    const actualResult = classifyMAD(1, 0);

    // THEN the result is null
    expect(actualResult).toBeNull();
  });

  test("should return GOOD when normalized MAD is below 0.1", () => {
    // GIVEN MAD=0.4, median=10 → normalized MAD = 0.04
    const actualResult = classifyMAD(0.4, 10);

    // THEN the label is GOOD
    expect(actualResult).toEqual({label: 'GOOD', range: '<0.1'});
  });

  test("should return FAIR when normalized MAD is exactly 0.1", () => {
    // GIVEN MAD=1, median=10 → normalized MAD = 0.1
    const actualResult = classifyMAD(1, 10);

    // THEN the label is FAIR
    expect(actualResult!.label).toBe('FAIR');
  });

  test("should return FAIR when normalized MAD is 0.3", () => {
    // GIVEN MAD=3, median=10 → normalized MAD = 0.3
    const actualResult = classifyMAD(3, 10);

    // THEN the label is still FAIR (inclusive)
    expect(actualResult).toEqual({label: 'FAIR', range: '0.1-0.3'});
  });

  test("should return POOR when normalized MAD exceeds 0.3", () => {
    // GIVEN MAD=4, median=10 → normalized MAD = 0.4
    const actualResult = classifyMAD(4, 10);

    // THEN the label is POOR
    expect(actualResult).toEqual({label: 'POOR', range: '>0.3'});
  });

  test("should use absolute value of median for negative medians", () => {
    // GIVEN MAD=0.4, median=-10 → normalized MAD = 0.04
    const actualResult = classifyMAD(0.4, -10);

    // THEN the label is GOOD (uses |median|)
    expect(actualResult).toEqual({label: 'GOOD', range: '<0.1'});
  });
});

describe("generateInterpretation", () => {
  function buildStats(overrides: Partial<Stats>): Stats {
    return {
      n: 31, min: 1, max: 10, mean: 5, median: 5, stddev: 1,
      marginOfError: 0.35, relativeMarginOfError: 7.0,
      confidenceInterval: [4.65, 5.35],
      coefficientOfVariation: 0.05, skewness: 0, mad: 1, isSmallSample: false,
      confidenceMethod: 'z', confidenceCriticalValue: 1.96, warnings: [],
      ...overrides,
    };
  }

  test("should return unreliable when CI is null (insufficient data)", () => {
    // GIVEN stats with null confidence interval (n=1 scenario)
    const givenStats = buildStats({
      n: 1, confidenceInterval: null, stddev: null,
      marginOfError: null, relativeMarginOfError: null,
      coefficientOfVariation: null, confidenceMethod: null,
      confidenceCriticalValue: null, isSmallSample: true,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it says results are unreliable
    expect(actualResult).toContain('results are unreliable');
    expect(actualResult).toContain('Add more iterations');
  });

  test("should return mean≈0 message when RME is null but CI exists", () => {
    // GIVEN stats with null RME (mean=0 scenario) but valid CI
    const givenStats = buildStats({
      mean: 0, relativeMarginOfError: null, coefficientOfVariation: null,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it explains the mean≈0 limitation
    expect(actualResult).toContain('relative error cannot be computed');
    expect(actualResult).toContain('mean is zero');
  });

  test("should return precise+consistent when RME is GOOD and CV is GOOD", () => {
    // GIVEN stats with GOOD RME and GOOD CV
    const givenRME = 5.0;
    const givenCV = 0.05;
    const givenStats = buildStats({
      relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it confirms safe for regression detection
    expect(actualResult).toContain('precise and consistent');
    expect(actualResult).toContain('safe for regression detection');
  });

  test("should return reliable when RME is GOOD and CV is FAIR", () => {
    // GIVEN stats with GOOD RME and FAIR CV
    const givenRME = 5.0;
    const givenCV = 0.2;
    const givenStats = buildStats({
      relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it says reliable with expected moderate variance
    expect(actualResult).toContain('results are reliable');
    expect(actualResult).toContain('moderate run-to-run variance');
  });

  test("should flag outlier-driven variance when RME is GOOD, CV is POOR, and MAD is LOW", () => {
    // GIVEN stats with GOOD RME, POOR CV, and LOW MAD (normalized MAD < 0.1)
    // MAD=0.4, median=5 → normalized=0.08 → GOOD (outliers inflating stddev)
    const givenStats = buildStats({
      relativeMarginOfError: 5.0, coefficientOfVariation: 0.5,
      mad: 0.4, median: 5,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it identifies outliers as the cause and recommends removal
    expect(actualResult).toContain('outliers are inflating variance');
    expect(actualResult).toContain('outlier removal');
  });

  test("should flag genuine inconsistency when RME is GOOD, CV is POOR, and MAD is HIGH", () => {
    // GIVEN stats with GOOD RME, POOR CV, and HIGH MAD (normalized MAD > 0.3)
    // MAD=3, median=5 → normalized=0.6 → POOR (genuine inconsistency)
    const givenStats = buildStats({
      relativeMarginOfError: 5.0, coefficientOfVariation: 0.5,
      mad: 3, median: 5,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it flags genuine inconsistency and recommends investigating noise
    expect(actualResult).toContain('genuinely inconsistent');
    expect(actualResult).toContain('investigate noise sources');
  });

  test("should flag outlier-driven variance when RME is GOOD, CV is POOR, and MAD is FAIR", () => {
    // GIVEN stats with GOOD RME, POOR CV, and FAIR MAD (not POOR → outlier branch)
    // MAD=1, median=5 → normalized=0.2 → FAIR
    const givenStats = buildStats({
      relativeMarginOfError: 5.0, coefficientOfVariation: 0.5,
      mad: 1, median: 5,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN FAIR MAD also routes to the outlier branch (not-POOR means outliers are the likely cause)
    expect(actualResult).toContain('outliers are inflating variance');
    expect(actualResult).toContain('MAD: FAIR 0.1-0.3');
  });

  test("should flag genuine inconsistency when RME is GOOD, CV is POOR, and MAD is null", () => {
    // GIVEN stats with GOOD RME, POOR CV, but MAD is null (median=0)
    const givenStats = buildStats({
      relativeMarginOfError: 5.0, coefficientOfVariation: 0.5,
      mad: null, median: 0,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it falls through to the genuine inconsistency branch
    expect(actualResult).toContain('genuinely inconsistent');
  });

  test("should return rough comparison when RME is FAIR and CV is FAIR", () => {
    // GIVEN stats with FAIR RME and FAIR CV
    const givenRME = 15.0;
    const givenCV = 0.2;
    const givenStats = buildStats({
      relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it suggests increasing iterations
    expect(actualResult).toContain('usable for rough comparison');
    expect(actualResult).toContain('increase iterations');
  });

  test("should flag outlier-driven variance when RME is FAIR, CV is POOR, and MAD is LOW", () => {
    // GIVEN stats with FAIR RME, POOR CV, and LOW MAD
    // MAD=0.4, median=5 → normalized=0.08 → GOOD
    const givenStats = buildStats({
      relativeMarginOfError: 15.0, coefficientOfVariation: 0.5,
      mad: 0.4, median: 5,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it identifies outliers and recommends removal + more iterations
    expect(actualResult).toContain('outliers are inflating variance');
    expect(actualResult).toContain('outlier removal');
    expect(actualResult).toContain('increase iterations');
  });

  test("should flag genuine wide variance when RME is FAIR, CV is POOR, and MAD is HIGH", () => {
    // GIVEN stats with FAIR RME, POOR CV, and HIGH MAD
    // MAD=3, median=5 → normalized=0.6 → POOR
    const givenStats = buildStats({
      relativeMarginOfError: 15.0, coefficientOfVariation: 0.5,
      mad: 3, median: 5,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it flags genuine variance and recommends environment investigation
    expect(actualResult).toContain('most runs vary widely');
    expect(actualResult).toContain('investigate environment stability');
    expect(actualResult).toContain('MAD: POOR >0.3');
  });

  test("should flag genuine wide variance when RME is FAIR, CV is POOR, and MAD is null", () => {
    // GIVEN stats with FAIR RME, POOR CV, and null MAD (median=0)
    const givenStats = buildStats({
      relativeMarginOfError: 15.0, coefficientOfVariation: 0.5,
      mad: null, median: 0,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it falls through to the genuine variance branch without MAD info
    expect(actualResult).toContain('most runs vary widely');
    expect(actualResult).not.toContain('MAD:');
  });

  test("should return not reliable with sample note when RME is POOR and sample is inadequate", () => {
    // GIVEN stats with POOR RME and small sample
    const givenRME = 40.0;
    const givenCV = 0.5;
    const givenN = 5;
    const givenStats = buildStats({
      n: givenN, relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
      isSmallSample: true,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it mentions unreliable mean, sample size, and remediation
    expect(actualResult).toContain('mean is not reliable');
    expect(actualResult).toContain(`${classifySampleAdequacy(givenN).label} sample size`);
    expect(actualResult).toContain('try increasing iterations');
  });

  test("should return not reliable without sample note when RME is POOR and sample is adequate", () => {
    // GIVEN stats with POOR RME but adequate sample
    const givenRME = 40.0;
    const givenCV = 0.5;
    const givenStats = buildStats({
      relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
    });

    // WHEN generating interpretation
    const actualResult = generateInterpretation(givenStats);

    // THEN it mentions unreliable mean and remediation but not sample size
    expect(actualResult).toContain('mean is not reliable');
    expect(actualResult).toContain('try increasing iterations');
    expect(actualResult).not.toContain('sample size');
  });

  test("should append CI-within-budget note when CI upper bound is below threshold", () => {
    // GIVEN stats with CI and a threshold well above the upper bound
    const givenCI: [number, number] = [4.65, 5.35];
    const givenStats = buildStats({confidenceInterval: givenCI});
    const givenThreshold = 10;

    // WHEN generating interpretation with threshold
    const actualResult = generateInterpretation(givenStats, givenThreshold);

    // THEN it confirms the CI is within budget
    const expectedLowerBound = formatMs(givenCI[0]);
    const expectedUpperBound = formatMs(givenCI[1]);
    expect(actualResult).toContain(`CI range [${expectedLowerBound}, ${expectedUpperBound}]ms is within your ${givenThreshold}ms threshold`);
    expect(actualResult).toContain('safely within budget');
  });

  test("should append CI-exceeds note when upper bound exceeds threshold but lower is within", () => {
    // GIVEN stats with CI where lower < threshold < upper
    const givenCI: [number, number] = [4.0, 12.0];
    const givenStats = buildStats({confidenceInterval: givenCI});
    const givenThreshold = 10;

    // WHEN generating interpretation with threshold
    const actualResult = generateInterpretation(givenStats, givenThreshold);

    // THEN it warns the upper bound exceeds budget
    const expectedUpperBound = formatMs(givenCI[1]);
    expect(actualResult).toContain(`CI upper bound (${expectedUpperBound}ms) exceeds your ${givenThreshold}ms threshold`);
    expect(actualResult).toContain('consider optimizing');
  });

  test("should append CI-entirely-above note when lower bound exceeds threshold", () => {
    // GIVEN stats with CI entirely above the threshold
    const givenCI: [number, number] = [15.0, 25.0];
    const givenStats = buildStats({confidenceInterval: givenCI});
    const givenThreshold = 10;

    // WHEN generating interpretation with threshold
    const actualResult = generateInterpretation(givenStats, givenThreshold);

    // THEN it flags the code as almost certainly too slow
    expect(actualResult).toContain(`entirely above your ${givenThreshold}ms threshold`);
    expect(actualResult).toContain('almost certainly too slow');
  });

  test("should append excluded-runs note when errorInfo has errors", () => {
    // GIVEN stats with valid CI and errorInfo indicating excluded runs
    const givenStats = buildStats({});
    const givenErrorInfo = {errorCount: 3, totalIterations: 50, allowedRate: 0.1};

    // WHEN generating interpretation with errorInfo
    const actualResult = generateInterpretation(givenStats, undefined, givenErrorInfo);

    // THEN the note about excluded runs is appended
    expect(actualResult).toContain(`${givenErrorInfo.errorCount} of ${givenErrorInfo.totalIterations} iterations were excluded due to errors`);
    expect(actualResult).toContain('stats reflect successful runs only');
  });

  test("should not append excluded-runs note when errorInfo has zero errors", () => {
    // GIVEN stats with valid CI and errorInfo with zero errors
    const givenStats = buildStats({});
    const givenErrorInfo = {errorCount: 0, totalIterations: 50, allowedRate: 0.1};

    // WHEN generating interpretation with errorInfo
    const actualResult = generateInterpretation(givenStats, undefined, givenErrorInfo);

    // THEN no excluded-runs note is appended
    expect(actualResult).not.toContain('iterations were excluded');
  });

  test("should not append excluded-runs note when errorInfo is undefined", () => {
    // GIVEN stats with valid CI and no errorInfo
    const givenStats = buildStats({});

    // WHEN generating interpretation without errorInfo
    const actualResult = generateInterpretation(givenStats);

    // THEN no excluded-runs note is appended
    expect(actualResult).not.toContain('iterations were excluded');
  });
});

describe("Test generateComparisonInterpretation function", () => {
  function buildCompStats(overrides: Partial<Stats>): Stats {
    return {
      n: 31, min: 1, max: 10, mean: 5, median: 5, stddev: 1,
      marginOfError: 0.35, relativeMarginOfError: 7.0,
      confidenceInterval: [4.65, 5.35],
      coefficientOfVariation: 0.05, skewness: 0, mad: 1, isSmallSample: false,
      confidenceMethod: 'z', confidenceCriticalValue: 1.96, warnings: [],
      ...overrides,
    };
  }

  function buildTTest(overrides: Partial<WelchTTestResult> = {}): WelchTTestResult {
    return {
      t: -5, df: 18, pValue: 0.001, meanDifference: -5,
      standardError: 1, confidenceInterval: [-7, -3],
      ...overrides,
    };
  }

  test("should return statistically significant faster when Function A has lower mean", () => {
    // GIVEN Function A with mean=5ms, Function B with mean=10ms, and a significant p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 5, median: 5});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.001, meanDifference: -5});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it reports Function A is statistically significantly faster with the p-value and difference
    expect(actualResult).toContain('statistically significantly faster');
    expect(actualResult).toContain('p=0.0010');
    expect(actualResult).toContain('5.00ms');
  });

  test("should return practically negligible when difference is less than 1%", () => {
    // GIVEN Function A with mean=99.95ms vs Function B with mean=100ms (0.05% difference) and a significant p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 99.95, median: 99.95});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 100, median: 100});
    const givenTTest = buildTTest({pValue: 0.001, meanDifference: -0.05});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it flags the difference as practically negligible despite being significant
    expect(actualResult).toContain('statistically significantly faster');
    expect(actualResult).toContain('less than 1%');
    expect(actualResult).toContain('practically negligible');
  });

  test("should return modest practical difference when difference is 1-5%", () => {
    // GIVEN Function A with mean=97ms vs Function B with mean=100ms (3% difference) and a significant p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 97, median: 97});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 100, median: 100});
    const givenTTest = buildTTest({pValue: 0.001, meanDifference: -3});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it describes the practical difference as modest
    expect(actualResult).toContain('statistically significantly faster');
    expect(actualResult).toContain('modest');
  });

  test("should return no significant evidence when Function A trends faster but p-value is high", () => {
    // GIVEN Function A slightly faster than Function B (9ms vs 10ms) but with a non-significant p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 9, median: 9});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.15, meanDifference: -1});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it reports no significant evidence and suggests increasing iterations
    expect(actualResult).toContain('no statistically significant evidence');
    expect(actualResult).toContain('trends faster');
    expect(actualResult).toContain('increase iterations');
  });

  test("should return appears slower when mean difference is positive", () => {
    // GIVEN Function A is slower than Function B (15ms vs 10ms) with a high p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 15, median: 15});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.99, meanDifference: 5});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it reports Function A appears to be slower (not faster)
    expect(actualResult).toContain('appears to be slower');
    expect(actualResult).toContain('not faster');
  });

  test("should return identical mean timing when mean difference is zero", () => {
    // GIVEN Function A and Function B with identical means (10ms each) and zero mean difference
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.5, meanDifference: 0});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it reports identical mean timing
    expect(actualResult).toContain('identical mean timing');
  });

  test("should return unreliable warning when Function A has POOR RME", () => {
    // GIVEN Function A with POOR RME (40%) and Function B with GOOD RME (5%)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 40, coefficientOfVariation: 0.5, mean: 10, median: 10});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 15, median: 15});
    const givenTTest = buildTTest({pValue: 0.01, meanDifference: -5});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it warns results are unreliable due to Function A's POOR RME
    expect(actualResult).toContain('unreliable');
    expect(actualResult).toContain('Function A has');
    expect(actualResult).toContain('POOR RME');
  });

  test("should return unreliable warning when Function B has POOR RME", () => {
    // GIVEN Function A with GOOD RME (5%) and Function B with POOR RME (40%)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 40, coefficientOfVariation: 0.5, mean: 15, median: 15});
    const givenTTest = buildTTest({pValue: 0.01, meanDifference: -5});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it warns results are unreliable due to Function B's POOR RME
    expect(actualResult).toContain('unreliable');
    expect(actualResult).toContain('Function B has');
    expect(actualResult).toContain('POOR RME');
  });

  test("should return unreliable warning when both functions have POOR RME", () => {
    // GIVEN both functions with POOR RME (40% each)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 40, coefficientOfVariation: 0.5, mean: 10, median: 10});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 40, coefficientOfVariation: 0.5, mean: 15, median: 15});
    const givenTTest = buildTTest({pValue: 0.01, meanDifference: -5});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it warns results are unreliable due to both functions having POOR RME
    expect(actualResult).toContain('unreliable');
    expect(actualResult).toContain('both functions have');
    expect(actualResult).toContain('POOR RME');
  });

  test("should return reliability warning when one function has null RME (near-zero mean)", () => {
    // GIVEN Function A with null RME (mean=0) and Function B with GOOD RME
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: null, coefficientOfVariation: null, mean: 0, median: 0});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.01, meanDifference: -10});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it warns that reliability cannot be assessed due to near-zero mean
    expect(actualResult).toContain('reliability cannot be assessed');
    expect(actualResult).toContain('near-zero mean');
  });

  test("should return reliability warning when both functions have null RME (both near-zero mean)", () => {
    // GIVEN both functions with null RME (both means are 0)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: null, coefficientOfVariation: null, mean: 0, median: 0});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: null, coefficientOfVariation: null, mean: 0, median: 0});
    const givenTTest = buildTTest({pValue: 0.5, meanDifference: 0});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it warns that reliability cannot be assessed due to near-zero mean
    expect(actualResult).toContain('reliability cannot be assessed');
    expect(actualResult).toContain('near-zero mean');
  });

  test("should format p-value as <0.0001 when p-value is below 0.0001", () => {
    // GIVEN a very large mean difference (5ms vs 50ms) with an extremely small p-value
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 5, median: 5});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 50, median: 50});
    const givenTTest = buildTTest({pValue: 0.00001, meanDifference: -45});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it formats the p-value as <0.0001
    expect(actualResult).toContain('p=<0.0001');
  });

  test("should use custom confidence level when determining significance", () => {
    // GIVEN p=0.08 (significant at alpha=0.10 but not at alpha=0.05)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 9, median: 9});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 10, median: 10});
    const givenTTest = buildTTest({pValue: 0.08, meanDifference: -1});

    // WHEN generating comparison interpretation at 95% and 90% confidence
    const actualResultStrict = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);
    const actualResultRelaxed = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.90);

    // THEN 95% reports not significant but 90% reports significant
    expect(actualResultStrict).toContain('no statistically significant evidence');
    expect(actualResultRelaxed).toContain('statistically significantly faster');
  });

  test("should not throw when meanB is zero (pctDiff edge case)", () => {
    // GIVEN Function B with mean=0 (division-by-zero edge case for percentage calculation)
    const givenFunctionAStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: -1, median: -1});
    const givenFunctionBStats = buildCompStats({relativeMarginOfError: 5, coefficientOfVariation: 0.1, mean: 0, median: 0});
    const givenTTest = buildTTest({pValue: 0.001, meanDifference: -1});

    // WHEN generating comparison interpretation
    const actualResult = generateComparisonInterpretation(givenFunctionAStats, givenFunctionBStats, givenTTest, 0.95);

    // THEN it reports significance without throwing a division-by-zero error
    expect(actualResult).toContain('statistically significantly faster');
  });
});

describe("generateThroughputInterpretation", () => {
  function buildThroughputStats(overrides: Partial<Stats>): Stats {
    return {
      n: 31, min: 1, max: 10, mean: 5, median: 5, stddev: 1,
      marginOfError: 0.35, relativeMarginOfError: 7.0,
      confidenceInterval: [4.65, 5.35],
      coefficientOfVariation: 0.05, skewness: 0, mad: 1, isSmallSample: false,
      confidenceMethod: 'z', confidenceCriticalValue: 1.96, warnings: [],
      ...overrides,
    };
  }

  test("should report stable and precise when above target with GOOD RME and GOOD CV", () => {
    // GIVEN per-operation stats are precise and consistent, with throughput above target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.05});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports target met with stable measurements
    expect(actualResult).toContain('throughput target met');
    expect(actualResult).toContain('stable, precise measurements');
  });

  test("should report outlier warning when above target with POOR CV and GOOD MAD", () => {
    // GIVEN per-operation variance is high but concentrated in a few outliers, with throughput above target
    const givenStats = buildThroughputStats({coefficientOfVariation: 0.5, mad: 0.3, median: 5});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports outlier ops slower
    expect(actualResult).toContain('few outlier ops are much slower');
    expect(actualResult).toContain('outlier removal');
  });

  test("should report genuinely unstable when above target with POOR CV and POOR MAD", () => {
    // GIVEN per-operation variance is genuinely high across all runs, with throughput above target
    const givenStats = buildThroughputStats({coefficientOfVariation: 0.5, mad: 2, median: 5});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports genuinely unstable
    expect(actualResult).toContain('genuinely unstable');
  });

  test("should report genuinely unstable when above target with POOR CV and null MAD", () => {
    // GIVEN per-operation variance is high with unknown dispersion pattern, and throughput above target
    const givenStats = buildThroughputStats({coefficientOfVariation: 0.5, mad: null});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports genuinely unstable
    expect(actualResult).toContain('genuinely unstable');
  });

  test("should report moderate precision when above target with FAIR RME", () => {
    // GIVEN per-operation stats have moderate precision and low variance, with throughput above target
    const givenStats = buildThroughputStats({relativeMarginOfError: 15, coefficientOfVariation: 0.05});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports moderate precision, not "precise"
    expect(actualResult).toContain('moderate precision');
    expect(actualResult).not.toContain('stable, precise');
  });

  test("should report unreliable measurement when below target with POOR RME", () => {
    // GIVEN per-operation measurement is unreliable, with throughput below target
    const givenStats = buildThroughputStats({relativeMarginOfError: 40});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 50, 100);

    // THEN it reports unreliable measurement
    expect(actualResult).toContain('measurement is unreliable');
    expect(actualResult).toContain('increase duration');
  });

  test("should report outlier drag when below target with GOOD RME, POOR CV, and GOOD MAD", () => {
    // GIVEN per-operation stats are precise but outliers are inflating variance, with throughput below target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.5, mad: 0.3, median: 5});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 50, 100);

    // THEN it reports outlier spikes dragging down throughput
    expect(actualResult).toContain('extreme outlier ops are dragging down throughput');
    expect(actualResult).toContain('outlier removal');
  });

  test("should report genuine inconsistency when below target with POOR CV and POOR MAD", () => {
    // GIVEN per-operation runs are genuinely inconsistent across all runs, with throughput below target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.5, mad: 2, median: 5});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 50, 100);

    // THEN it reports genuinely inconsistent
    expect(actualResult).toContain('genuinely inconsistent');
    expect(actualResult).toContain('environment stability');
  });

  test("should report genuine inconsistency when below target with POOR CV and null MAD", () => {
    // GIVEN per-operation variance is high with unknown dispersion pattern, and throughput below target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.5, mad: null});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 50, 100);

    // THEN it reports genuinely inconsistent
    expect(actualResult).toContain('genuinely inconsistent');
  });

  test("should report code is too slow when below target with GOOD RME and GOOD CV", () => {
    // GIVEN per-operation stats are precise and consistent, but throughput is below target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.05});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 50, 100);

    // THEN it reports code is too slow
    expect(actualResult).toContain('consistently');
    expect(actualResult).toContain('below target');
    expect(actualResult).toContain('too slow');
  });

  test("should handle null RME when mean is near zero", () => {
    // GIVEN per-operation timing mean is near zero making relative metrics unavailable
    const givenStats = buildThroughputStats({relativeMarginOfError: null, coefficientOfVariation: null});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports near-zero mean
    expect(actualResult).toContain('near zero');
  });

  test("should handle null CI when insufficient data", () => {
    // GIVEN per-operation timing has insufficient data for confidence intervals
    const givenStats = buildThroughputStats({confidenceInterval: null});

    // WHEN interpreting throughput results
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100);

    // THEN it reports insufficient data
    expect(actualResult).toContain('insufficient data');
  });

  test("should include error info note when errors present", () => {
    // GIVEN per-operation stats are precise and consistent, with some operations excluded due to errors
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.05});
    const givenErrorInfo = {errorCount: 3, totalIterations: 100, allowedRate: 0.1};

    // WHEN interpreting throughput results with error info
    const actualResult = generateThroughputInterpretation(givenStats, 200, 100, givenErrorInfo);

    // THEN it includes the error exclusion note
    expect(actualResult).toContain('3 of 100 operations failed');
    expect(actualResult).toContain('stats reflect successful ops only');
  });

  test("should report above target at exact boundary (100%)", () => {
    // GIVEN per-operation stats are precise and consistent, with throughput exactly at target
    const givenStats = buildThroughputStats({relativeMarginOfError: 5, coefficientOfVariation: 0.05});

    // WHEN interpreting throughput at the exact target boundary
    const actualResult = generateThroughputInterpretation(givenStats, 100, 100);

    // THEN it reports target met (since actualOps >= expectedOps)
    expect(actualResult).toContain('throughput target met');
  });
});

describe("hasWarningConditions", () => {
  function buildStats(overrides: Partial<Stats>): Stats {
    return {
      n: 31, min: 1, max: 10, mean: 5, median: 5, stddev: 1,
      marginOfError: 0.35, relativeMarginOfError: 7.0,
      confidenceInterval: [4.65, 5.35] as [number, number],
      coefficientOfVariation: 0.05, skewness: 0, mad: 1, isSmallSample: false,
      confidenceMethod: 'z', confidenceCriticalValue: 1.96, warnings: [],
      ...overrides,
    };
  }

  test("should return false when all conditions are clean", () => {
    // GIVEN stats with all GOOD classifications and no error info
    const givenStats = buildStats({});

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats, 10);

    // THEN no warnings are detected
    expect(actualResult).toBe(false);
  });

  test("should return true when sample adequacy is POOR (n < 10)", () => {
    // GIVEN stats with n < 10
    const givenStats = buildStats({n: 5});

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return true when RME is POOR (> 30%)", () => {
    // GIVEN stats with POOR RME
    const givenStats = buildStats({relativeMarginOfError: 35});

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return true when CV is POOR (> 0.3)", () => {
    // GIVEN stats with POOR CV
    const givenStats = buildStats({coefficientOfVariation: 0.5});

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return true when CI upper bound exceeds the threshold", () => {
    // GIVEN stats with CI upper bound above the threshold
    const givenStats = buildStats({confidenceInterval: [4.0, 6.0]});

    // WHEN checking with threshold below CI upper
    const actualResult = hasWarningConditions(givenStats, 5.5);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return true when CI range is entirely above the threshold", () => {
    // GIVEN stats with CI entirely above the threshold
    const givenStats = buildStats({confidenceInterval: [6.0, 8.0]});

    // WHEN checking with threshold below CI lower
    const actualResult = hasWarningConditions(givenStats, 5.0);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return true when error rate is non-zero", () => {
    // GIVEN clean stats but non-zero error info
    const givenStats = buildStats({});
    const givenErrorInfo = {errorCount: 2, totalIterations: 31, allowedRate: 0.1};

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats, undefined, givenErrorInfo);

    // THEN a warning is detected
    expect(actualResult).toBe(true);
  });

  test("should return false when errorInfo has zero errors", () => {
    // GIVEN clean stats with zero-error errorInfo
    const givenStats = buildStats({});
    const givenErrorInfo = {errorCount: 0, totalIterations: 31, allowedRate: 0.1};

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats, 10, givenErrorInfo);

    // THEN no warnings are detected
    expect(actualResult).toBe(false);
  });

  test("should return false when CI is null and no threshold", () => {
    // GIVEN stats with null CI and no threshold
    const givenStats = buildStats({confidenceInterval: null});

    // WHEN checking without a threshold
    const actualResult = hasWarningConditions(givenStats);

    // THEN no warnings (CI check is skipped)
    expect(actualResult).toBe(false);
  });

  test("should return false when RME and CV are null (mean ≈ 0)", () => {
    // GIVEN stats where RME and CV are null
    const givenStats = buildStats({
      relativeMarginOfError: null, coefficientOfVariation: null,
    });

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats);

    // THEN no warnings from null classifiers
    expect(actualResult).toBe(false);
  });

  test("should return true when multiple warning conditions hold simultaneously", () => {
    // GIVEN stats with POOR sample, POOR RME, POOR CV, and non-zero errors all together
    const givenStats = buildStats({
      n: 5, relativeMarginOfError: 50, coefficientOfVariation: 0.6,
    });
    const givenErrorInfo = {errorCount: 3, totalIterations: 8, allowedRate: 0.5};

    // WHEN checking for warning conditions
    const actualResult = hasWarningConditions(givenStats, 5.5, givenErrorInfo);

    // THEN a warning is detected (short-circuits on the first match)
    expect(actualResult).toBe(true);
  });

  test("should return false when threshold is undefined even with wide CI", () => {
    // GIVEN stats with wide CI but no threshold provided
    const givenStats = buildStats({confidenceInterval: [1, 100]});

    // WHEN checking without a threshold
    const actualResult = hasWarningConditions(givenStats);

    // THEN no CI-related warning
    expect(actualResult).toBe(false);
  });
});
