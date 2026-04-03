import {calcQuantile, calcStats, removeOutliers} from "../src/metrics";

describe("Test calcQuantile function", () => {
    test.each([
        [1, [1], 1],
        [50, [1], 1],
        [100, [1], 1],
        [1, [0, 1, 2], 0.02],
        [10, [0, 1, 2], 0.2],
        [30, [0, 1, 2], 0.6],
        [50, [0, 1, 2], 1],
        [75, [0, 1, 2], 1.5],
        [100, [0, 1, 2], 2],
        [1, [-1, 0, 2], -0.98],
        [10, [-1, 0, 2], -0.8],
        [30, [-1, 0, 2], -0.4],
        [50, [-1, 0, 2], 0],
        [75, [-1, 0, 2], 1],
        [100, [-1, 0, 2], 2],
    ])("should successfully calculate quantiles", (q, data, result) => {
        expect(calcQuantile(q as number, data as number[])).toEqual(result);
    });

    test("should not mutate the input array", () => {
        const data = [3, 1, 2];
        calcQuantile(50, data);
        expect(data).toEqual([3, 1, 2]);
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["not an array", "string"],
        ["not an array of numbers", ["NaN", "0.2"]],
        ["an empty array", []],
        // eslint-disable-next-line no-sparse-arrays
        ["a sparse array", [1, , 3]]
    ])("should throw an error when data is %s", (description, data) => {
        // @ts-expect-error - intentionally passing invalid data for testing
        expect(() => calcQuantile(50, data)).toThrowError(/Data must be an array of numbers and must contain at least one element/);
    });
    test.each([
        ["undefined", undefined],
        ["null", null],
        ["NaN", "string"],
        ["not an integer", 0.1]
    ])("should throw an error when value is %s", (description, q) => {
        // @ts-expect-error - intentionally passing invalid quantile for testing
        expect(() => calcQuantile(q, [])).toThrowError(/Quantile must be an integer greater than 0 and less than or equal to 100/);
    });
});

describe("Test removeOutliers function", () => {
    test("should remove outliers from a dataset with extreme values", () => {
        const data = [10, 11, 12, 10, 11, 100];
        const result = removeOutliers(data);
        expect(result).toEqual([10, 11, 12, 10, 11]);
    });

    test("should return a copy when no outliers exist", () => {
        const data = [10, 11, 12, 13, 14];
        const result = removeOutliers(data);
        expect(result).toEqual([10, 11, 12, 13, 14]);
    });

    test("should return a copy for datasets with fewer than 4 elements", () => {
        const data = [1, 2, 100];
        const result = removeOutliers(data);
        expect(result).toEqual([1, 2, 100]);
    });

    test("should not mutate the input array", () => {
        const data = [10, 11, 12, 10, 11, 100];
        removeOutliers(data);
        expect(data).toEqual([10, 11, 12, 10, 11, 100]);
    });

    test("should remove both low and high outliers", () => {
        const data = [-100, 10, 11, 12, 13, 14, 200];
        const result = removeOutliers(data);
        expect(result).toEqual([10, 11, 12, 13, 14]);
    });

    test("should handle identical values", () => {
        const data = [5, 5, 5, 5, 5];
        const result = removeOutliers(data);
        expect(result).toEqual([5, 5, 5, 5, 5]);
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["not an array", "string"],
        ["not an array of numbers", ["1", "2", "3", "4"]],
        ["an empty array", []],
        ["an array containing NaN", [1, NaN, 3, 4]],
        // eslint-disable-next-line no-sparse-arrays
        ["a sparse array", [1, , 3, 4]],
    ])("should throw an error when data is %s", (description, data) => {
        // @ts-expect-error - intentionally passing invalid data for testing
        expect(() => removeOutliers(data)).toThrowError(/Data must be an array of numbers and must contain at least one element/);
    });
});

describe("Test calcStats function", () => {
    test("should calculate stats for a simple dataset (n=5, t-based)", () => {
        const stats = calcStats([1, 2, 3, 4, 5]);
        expect(stats.n).toBe(5);
        expect(stats.min).toBe(1);
        expect(stats.max).toBe(5);
        expect(stats.mean).toBe(3);
        expect(stats.median).toBe(3);
        // Bessel's correction: variance = 10/4 = 2.5, stddev = sqrt(2.5)
        expect(stats.stddev).toBeCloseTo(Math.sqrt(2.5), 10);
        expect(stats.isSmallSample).toBe(true);
        expect(stats.confidenceMethod).toBe("t");
        expect(stats.confidenceCriticalValue).toBe(2.776);
    });

    test("should calculate margin of error using t-distribution for small samples", () => {
        const data = [1, 2, 3, 4, 5];
        const stats = calcStats(data);
        // t-based: MoE = t(df=4) * stddev / sqrt(n) = 2.776 * sqrt(2.5) / sqrt(5)
        const expectedMoE = 2.776 * Math.sqrt(2.5) / Math.sqrt(5);
        expect(stats.marginOfError).toBeCloseTo(expectedMoE, 10);
    });

    test("should calculate relative margin of error as a percentage", () => {
        const data = [1, 2, 3, 4, 5];
        const stats = calcStats(data);
        const expectedMoE = 2.776 * Math.sqrt(2.5) / Math.sqrt(5);
        const expectedRME = (expectedMoE / 3) * 100;
        expect(stats.relativeMarginOfError).toBeCloseTo(expectedRME, 10);
    });

    test("should calculate 95% confidence interval using t-distribution", () => {
        const data = [1, 2, 3, 4, 5];
        const stats = calcStats(data);
        const expectedMoE = 2.776 * Math.sqrt(2.5) / Math.sqrt(5);
        expect(stats.confidenceInterval![0]).toBeCloseTo(3 - expectedMoE, 10);
        expect(stats.confidenceInterval![1]).toBeCloseTo(3 + expectedMoE, 10);
    });

    test("should calculate coefficient of variation with sample stddev", () => {
        const data = [1, 2, 3, 4, 5];
        const stats = calcStats(data);
        // coefficientOfVariation = stddev / |mean| = sqrt(2.5) / 3
        expect(stats.coefficientOfVariation).toBeCloseTo(Math.sqrt(2.5) / 3, 10);
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["not an array", "string"],
        ["not an array of numbers", ["1", "2", "3", "4"]],
        ["an empty array", []],
        ["an array containing NaN", [1, NaN, 3, 4]],
        // eslint-disable-next-line no-sparse-arrays
        ["a sparse array", [1, , 3, 4]],
    ])("should throw an error when data is %s", (description, data) => {
        // @ts-expect-error - intentionally passing invalid data for testing
        expect(() => calcStats(data)).toThrowError(/Data must be an array of numbers and must contain at least one element/);
    });

    test("should return null stddev and CI for a single value (n=1)", () => {
        const stats = calcStats([42]);
        expect(stats.n).toBe(1);
        expect(stats.min).toBe(42);
        expect(stats.max).toBe(42);
        expect(stats.mean).toBe(42);
        expect(stats.median).toBe(42);
        expect(stats.stddev).toBeNull();
        expect(stats.marginOfError).toBeNull();
        expect(stats.relativeMarginOfError).toBeNull();
        expect(stats.confidenceInterval).toBeNull();
        expect(stats.coefficientOfVariation).toBeNull();
        expect(stats.skewness).toBeNull();
        expect(stats.isSmallSample).toBe(true);
        expect(stats.confidenceMethod).toBeNull();
        expect(stats.confidenceCriticalValue).toBeNull();
        expect(stats.warnings).toContain("Single data point: standard deviation and confidence interval cannot be computed");
        expect(stats.warnings).toContain("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");
    });

    test("should use t-distribution with df=1 for n=2", () => {
        const stats = calcStats([10, 20]);
        expect(stats.n).toBe(2);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(20);
        expect(stats.mean).toBe(15);
        expect(stats.isSmallSample).toBe(true);
        expect(stats.confidenceMethod).toBe("t");
        expect(stats.confidenceCriticalValue).toBe(12.706);
        // variance = (25 + 25) / 1 = 50, stddev = sqrt(50)
        expect(stats.stddev).toBeCloseTo(Math.sqrt(50), 10);
        const expectedMoE = 12.706 * Math.sqrt(50) / Math.sqrt(2);
        expect(stats.marginOfError).toBeCloseTo(expectedMoE, 10);
        expect(stats.confidenceInterval![0]).toBeCloseTo(15 - expectedMoE, 10);
        expect(stats.confidenceInterval![1]).toBeCloseTo(15 + expectedMoE, 10);
        // Skewness requires n >= 3, so null for n=2
        expect(stats.skewness).toBeNull();
    });

    test("should calculate stats for identical values", () => {
        const stats = calcStats([10, 10, 10]);
        expect(stats.n).toBe(3);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(10);
        expect(stats.mean).toBe(10);
        expect(stats.median).toBe(10);
        expect(stats.stddev).toBe(0);
        expect(stats.marginOfError).toBe(0);
        expect(stats.relativeMarginOfError).toBe(0);
        expect(stats.confidenceInterval).toEqual([10, 10]);
        expect(stats.coefficientOfVariation).toBe(0);
        expect(stats.confidenceMethod).toBe("t");
        // Skewness null when stddev is 0
        expect(stats.skewness).toBeNull();
    });

    test("should return null for RME and CV when mean is zero", () => {
        const data = [-2, -1, 0, 1, 2];
        const stats = calcStats(data);
        expect(stats.mean).toBe(0);
        expect(stats.relativeMarginOfError).toBeNull();
        expect(stats.coefficientOfVariation).toBeNull();
        // Bessel's: variance = 10/4 = 2.5, stddev = sqrt(2.5)
        expect(stats.stddev).toBeCloseTo(Math.sqrt(2.5), 10);
        // marginOfError and CI should still be computed
        expect(stats.marginOfError).not.toBeNull();
        expect(stats.confidenceInterval).not.toBeNull();
    });

    test("should use t-distribution at n=29 boundary", () => {
        const data = Array.from({length: 29}, (_, i) => i + 1);
        const stats = calcStats(data);
        expect(stats.n).toBe(29);
        expect(stats.isSmallSample).toBe(true);
        expect(stats.confidenceMethod).toBe("t");
        expect(stats.confidenceCriticalValue).toBe(2.048);
    });

    test("should use t-distribution at n=30 boundary and mark as small sample", () => {
        const data = Array.from({length: 30}, (_, i) => i + 1);
        const stats = calcStats(data);
        expect(stats.n).toBe(30);
        expect(stats.isSmallSample).toBe(true);
        expect(stats.confidenceMethod).toBe("t");
        expect(stats.confidenceCriticalValue).toBe(2.045);
        expect(stats.warnings).toContain("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");
    });

    test("should use z-distribution at n=31 boundary and not mark as small sample", () => {
        const data = Array.from({length: 31}, (_, i) => i + 1);
        const stats = calcStats(data);
        expect(stats.n).toBe(31);
        expect(stats.isSmallSample).toBe(false);
        expect(stats.confidenceMethod).toBe("z");
        expect(stats.confidenceCriticalValue).toBe(1.96);
        expect(stats.warnings).toEqual([]);
    });

    test("should include small sample warning for n <= 30", () => {
        const data = [1, 2, 3, 4, 5];
        const stats = calcStats(data);
        expect(stats.warnings).toContain("Small sample size (n <= 30): confidence intervals are less stable and more sensitive to individual values");
    });

    test("should not include small sample warning for n > 30", () => {
        const data = Array.from({length: 31}, (_, i) => i + 1);
        const stats = calcStats(data);
        expect(stats.warnings).toEqual([]);
    });

    test("should not mutate the input array", () => {
        const data = [3, 1, 2];
        calcStats(data);
        expect(data).toEqual([3, 1, 2]);
    });

    test("should compute skewness for n=3 (minimum valid case)", () => {
        const stats = calcStats([1, 2, 10]);
        expect(stats.skewness).not.toBeNull();
        // Hand-computed G1 for [1, 2, 10]: 1.652316740332991
        expect(stats.skewness).toBeCloseTo(1.652316740332991, 10);
    });

    test("should compute positive skewness for right-skewed data", () => {
        const stats = calcStats([1, 2, 2, 3, 3, 3, 10]);
        expect(stats.skewness).not.toBeNull();
        expect(stats.skewness!).toBeGreaterThan(0.5);
        // Hand-computed G1: 2.294375699439329
        expect(stats.skewness).toBeCloseTo(2.294375699439329, 10);
    });

    test("should compute negative skewness for left-skewed data", () => {
        const stats = calcStats([1, 8, 8, 9, 9, 9, 10]);
        expect(stats.skewness).not.toBeNull();
        expect(stats.skewness!).toBeLessThan(-0.5);
        // Hand-computed G1: -2.362764941760541
        expect(stats.skewness).toBeCloseTo(-2.362764941760541, 10);
    });

    test("should compute zero skewness for perfectly symmetric data", () => {
        const stats = calcStats([1, 2, 3, 4, 5]);
        expect(stats.skewness).not.toBeNull();
        expect(stats.skewness).toBe(0);
    });
});
