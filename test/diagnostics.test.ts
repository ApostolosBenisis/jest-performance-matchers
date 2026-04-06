import {
    classifyRME, classifyCV, classifySampleAdequacy,
    generateInterpretation, formatTag, Tag
} from '../src/diagnostics';
import {Stats} from '../src/metrics';

describe("formatTag", () => {
    test("should combine label and range into a display string", () => {
        // GIVEN a tag with label and range
        const givenTag: Tag = { label: 'GOOD', range: '<10%' };

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
        expect(actualResult).toEqual({ label: 'GOOD', range: '<10%' });
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
        expect(actualResult).toEqual({ label: 'FAIR', range: '10-30%' });
    });

    test("should return POOR when RME exceeds 30%", () => {
        // GIVEN an RME above the POOR threshold
        const givenRME = 30.01;

        // WHEN classifying
        const actualResult = classifyRME(givenRME);

        // THEN the label is POOR
        expect(actualResult).toEqual({ label: 'POOR', range: '>30%' });
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
        expect(actualResult).toEqual({ label: 'GOOD', range: '<0.1' });
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
        expect(actualResult).toEqual({ label: 'FAIR', range: '0.1-0.3' });
    });

    test("should return POOR when CV exceeds 0.3", () => {
        // GIVEN a CV above the POOR threshold
        const givenCV = 0.31;

        // WHEN classifying
        const actualResult = classifyCV(givenCV);

        // THEN the label is POOR
        expect(actualResult).toEqual({ label: 'POOR', range: '>0.3' });
    });
});

describe("classifySampleAdequacy", () => {
    test("should return POOR when n is below 10", () => {
        // GIVEN a sample size below the POOR threshold
        const givenN = 5;

        // WHEN classifying
        const actualResult = classifySampleAdequacy(givenN);

        // THEN the label is POOR
        expect(actualResult).toEqual({ label: 'POOR', range: '<10' });
    });

    test("should return FAIR when n is exactly 10", () => {
        // GIVEN a sample size at the FAIR boundary
        const givenN = 10;

        // WHEN classifying
        const actualResult = classifySampleAdequacy(givenN);

        // THEN the label is FAIR
        expect(actualResult).toEqual({ label: 'FAIR', range: '10-30' });
    });

    test("should return FAIR when n is 30", () => {
        // GIVEN a sample size at the upper FAIR boundary
        const givenN = 30;

        // WHEN classifying
        const actualResult = classifySampleAdequacy(givenN);

        // THEN the label is still FAIR (inclusive)
        expect(actualResult).toEqual({ label: 'FAIR', range: '10-30' });
    });

    test("should return GOOD when n exceeds 30", () => {
        // GIVEN a sample size above the GOOD threshold
        const givenN = 31;

        // WHEN classifying
        const actualResult = classifySampleAdequacy(givenN);

        // THEN the label is GOOD
        expect(actualResult).toEqual({ label: 'GOOD', range: '>30' });
    });
});

describe("generateInterpretation", () => {
    function buildStats(overrides: Partial<Stats>): Stats {
        return {
            n: 31, min: 1, max: 10, mean: 5, median: 5, stddev: 1,
            marginOfError: 0.35, relativeMarginOfError: 7.0,
            confidenceInterval: [4.65, 5.35],
            coefficientOfVariation: 0.05, skewness: 0, isSmallSample: false,
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

    test("should flag inconsistent runs when RME is GOOD and CV is POOR", () => {
        // GIVEN stats with GOOD RME and POOR CV
        const givenRME = 5.0;
        const givenCV = 0.5;
        const givenStats = buildStats({
            relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
        });

        // WHEN generating interpretation
        const actualResult = generateInterpretation(givenStats);

        // THEN it warns about inconsistent individual runs
        expect(actualResult).toContain('precise but individual runs vary widely');
        expect(actualResult).toContain('investigate noise sources');
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

    test("should flag double concern when RME is FAIR and CV is POOR", () => {
        // GIVEN stats with FAIR RME and POOR CV
        const givenRME = 15.0;
        const givenCV = 0.5;
        const givenStats = buildStats({
            relativeMarginOfError: givenRME, coefficientOfVariation: givenCV,
        });

        // WHEN generating interpretation
        const actualResult = generateInterpretation(givenStats);

        // THEN it flags both approximate mean and high variance
        expect(actualResult).toContain('approximate and variance is high');
        expect(actualResult).toContain('investigate noise sources');
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
        const givenStats = buildStats({ confidenceInterval: givenCI });
        const givenThreshold = 10;

        // WHEN generating interpretation with threshold
        const actualResult = generateInterpretation(givenStats, givenThreshold);

        // THEN it confirms the CI is within budget
        const expectedLowerBound = givenCI[0].toFixed(2);
        const expectedUpperBound = givenCI[1].toFixed(2);
        expect(actualResult).toContain(`CI range [${expectedLowerBound}, ${expectedUpperBound}]ms is within your ${givenThreshold}ms threshold`);
        expect(actualResult).toContain('safely within budget');
    });

    test("should append CI-exceeds note when upper bound exceeds threshold but lower is within", () => {
        // GIVEN stats with CI where lower < threshold < upper
        const givenCI: [number, number] = [4.0, 12.0];
        const givenStats = buildStats({ confidenceInterval: givenCI });
        const givenThreshold = 10;

        // WHEN generating interpretation with threshold
        const actualResult = generateInterpretation(givenStats, givenThreshold);

        // THEN it warns the upper bound exceeds budget
        const expectedUpperBound = givenCI[1].toFixed(2);
        expect(actualResult).toContain(`CI upper bound (${expectedUpperBound}ms) exceeds your ${givenThreshold}ms threshold`);
        expect(actualResult).toContain('consider optimizing');
    });

    test("should append CI-entirely-above note when lower bound exceeds threshold", () => {
        // GIVEN stats with CI entirely above the threshold
        const givenCI: [number, number] = [15.0, 25.0];
        const givenStats = buildStats({ confidenceInterval: givenCI });
        const givenThreshold = 10;

        // WHEN generating interpretation with threshold
        const actualResult = generateInterpretation(givenStats, givenThreshold);

        // THEN it flags the code as almost certainly too slow
        expect(actualResult).toContain(`entirely above your ${givenThreshold}ms threshold`);
        expect(actualResult).toContain('almost certainly too slow');
    });
});
