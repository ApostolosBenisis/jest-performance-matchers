import {calcQuantile, calcStats, removeOutliers, lnGamma, regularizedIncompleteBeta, tDistCDF, welchTTest} from "../src/metrics";

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
  ])("should throw an error when data is %s (not an array)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => calcQuantile(50, data)).toThrowError(/Data is required and must be an array/);
  });

  test("should throw an error when data is an empty array", () => {
    expect(() => calcQuantile(50, [])).toThrowError(/Data must contain at least one element/);
  });

  // noinspection JSConsecutiveCommasInArrayLiteral
    test.each([
    ["not an array of numbers", ["NaN", "0.2"]],
    ["an array containing NaN", [1, NaN, 3]],
    ["an array containing Infinity", [1, Infinity, 3]],
    ["an array containing -Infinity", [1, -Infinity, 3]],
    // eslint-disable-next-line no-sparse-arrays
    ["a sparse array", [1, , 3]],
  ])("should throw an error when data is %s (non-finite element)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => calcQuantile(50, data)).toThrowError(/Data must contain only finite numbers/);
  });

  test("should report the correct index in the non-finite element error message", () => {
    expect(() => calcQuantile(50, [1, NaN, 3])).toThrowError(/found NaN at index 1/);
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["NaN", "string"],
    ["not an integer", 0.1]
  ])("should throw an error when value is %s", (_description, q) => {
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
  ])("should throw an error when data is %s (not an array)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => removeOutliers(data)).toThrowError(/Data is required and must be an array/);
  });

  test("should throw an error when data is an empty array", () => {
    expect(() => removeOutliers([])).toThrowError(/Data must contain at least one element/);
  });

  // noinspection JSConsecutiveCommasInArrayLiteral
    test.each([
    ["not an array of numbers", ["1", "2", "3", "4"]],
    ["an array containing NaN", [1, NaN, 3, 4]],
    ["an array containing Infinity", [1, Infinity, 3, 4]],
    ["an array containing -Infinity", [1, -Infinity, 3, 4]],
    // eslint-disable-next-line no-sparse-arrays
    ["a sparse array", [1, , 3, 4]],
  ])("should throw an error when data is %s (non-finite element)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => removeOutliers(data)).toThrowError(/Data must contain only finite numbers/);
  });

  test("should report the correct index in the non-finite element error message", () => {
    expect(() => removeOutliers([10, 11, Infinity, 13])).toThrowError(/found Infinity at index 2/);
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
  ])("should throw an error when data is %s (not an array)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => calcStats(data)).toThrowError(/Data is required and must be an array/);
  });

  test("should throw an error when data is an empty array", () => {
    expect(() => calcStats([])).toThrowError(/Data must contain at least one element/);
  });

  // noinspection JSConsecutiveCommasInArrayLiteral
    test.each([
    ["not an array of numbers", ["1", "2", "3", "4"]],
    ["an array containing NaN", [1, NaN, 3, 4]],
    ["an array containing Infinity", [1, Infinity, 3, 4]],
    ["an array containing -Infinity", [1, -Infinity, 3, 4]],
    // eslint-disable-next-line no-sparse-arrays
    ["a sparse array", [1, , 3, 4]],
  ])("should throw an error when data is %s (non-finite element)", (_description, data) => {
    // @ts-expect-error - intentionally passing invalid data for testing
    expect(() => calcStats(data)).toThrowError(/Data must contain only finite numbers/);
  });

  test("should report the correct index in the non-finite element error message", () => {
    expect(() => calcStats([5, 10, -Infinity, 20])).toThrowError(/found -Infinity at index 2/);
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
    expect(stats.mad).toBeNull();
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
    expect(stats.mad).toBe(0);
  });

  test("should return null for RME and CV when mean is zero", () => {
    const data = [-2, -1, 0, 1, 2];
    const stats = calcStats(data);
    expect(stats.mean).toBe(0);
    expect(stats.median).toBe(0);
    expect(stats.relativeMarginOfError).toBeNull();
    expect(stats.coefficientOfVariation).toBeNull();
    // Bessel's: variance = 10/4 = 2.5, stddev = sqrt(2.5)
    expect(stats.stddev).toBeCloseTo(Math.sqrt(2.5), 10);
    // marginOfError and CI should still be computed
    expect(stats.marginOfError).not.toBeNull();
    expect(stats.confidenceInterval).not.toBeNull();
    // MAD is computable (median=0, deviations=[2,1,0,1,2], sorted=[0,1,1,2,2], MAD=1)
    expect(stats.mad).toBe(1);
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

  test("should calculate MAD for a simple dataset", () => {
    // median=3, deviations=[2,1,0,1,2], sorted=[0,1,1,2,2], median of deviations=1
    const stats = calcStats([1, 2, 3, 4, 5]);
    expect(stats.mad).toBe(1);
  });

  test("should calculate MAD for n=2", () => {
    // median=15, deviations=[5,5], sorted=[5,5], median of deviations=5
    const stats = calcStats([10, 20]);
    expect(stats.mad).toBe(5);
  });

  test("should calculate MAD for skewed data", () => {
    // median=3, deviations=[2,1,1,0,0,0,7], sorted=[0,0,0,1,1,2,7], median at pos=3 → 1
    const stats = calcStats([1, 2, 2, 3, 3, 3, 10]);
    expect(stats.mad).toBe(1);
  });

  test("should calculate MAD for a large dataset (n=31)", () => {
    // [1..31], median=16, deviations=[15,14,...,0,...,14,15], sorted=[0,1,...,15], median=8
    const data = Array.from({length: 31}, (_, i) => i + 1);
    const stats = calcStats(data);
    expect(stats.mad).not.toBeNull();
    expect(stats.mad).toBe(8);
  });
});

describe("Test lnGamma function", () => {
  test("should return 0 when x is 1 (Gamma(1) = 1)", () => {
    // GIVEN x = 1 (Gamma(1) = 1, so ln(1) = 0)
    const givenX = 1;
    const expectedResult = 0;

    // WHEN computing lnGamma
    const actualResult = lnGamma(givenX);

    // THEN it returns 0
    expect(actualResult).toBeCloseTo(expectedResult, 10);
  });

  test("should return ln(sqrt(pi)) when x is 0.5", () => {
    // GIVEN x = 0.5 (Gamma(0.5) = sqrt(pi))
    const givenX = 0.5;
    const expectedResult = Math.log(Math.sqrt(Math.PI));

    // WHEN computing lnGamma
    const actualResult = lnGamma(givenX);

    // THEN it returns ln(sqrt(pi))
    expect(actualResult).toBeCloseTo(expectedResult, 10);
  });

  test("should return ln(24) when x is 5 (Gamma(5) = 4! = 24)", () => {
    // GIVEN x = 5 (Gamma(5) = 4! = 24)
    const givenX = 5;
    const expectedResult = Math.log(24);

    // WHEN computing lnGamma
    const actualResult = lnGamma(givenX);

    // THEN it returns ln(24)
    expect(actualResult).toBeCloseTo(expectedResult, 10);
  });

  test("should return ln(362880) when x is 10 (Gamma(10) = 9!)", () => {
    // GIVEN x = 10 (Gamma(10) = 9! = 362880)
    const givenX = 10;
    const expectedResult = Math.log(362880);

    // WHEN computing lnGamma
    const actualResult = lnGamma(givenX);

    // THEN it returns ln(362880)
    expect(actualResult).toBeCloseTo(expectedResult, 8);
  });

  test("should throw an error when x is zero or negative", () => {
    // GIVEN x = 0 and x = -1 (both invalid for lnGamma)
    const givenZero = 0;
    const givenNegative = -1;

    // WHEN computing lnGamma with invalid input,
    // THEN a descriptive error is thrown
    expect(() => lnGamma(givenZero)).toThrow("lnGamma requires x > 0");
    expect(() => lnGamma(givenNegative)).toThrow("lnGamma requires x > 0");
  });

  test("should use reflection formula when x is a small fractional value", () => {
    // GIVEN x = 0.25 (triggers the reflection formula for x < 0.5)
    const givenX = 0.25;
    const expectedResult = 1.2880225246;

    // WHEN computing lnGamma
    const actualResult = lnGamma(givenX);

    // THEN it returns the expected value via reflection
    expect(actualResult).toBeCloseTo(expectedResult, 6);
  });
});

describe("Test regularizedIncompleteBeta function", () => {
  test("should return 0 when x is 0 for any a, b", () => {
    // GIVEN x = 0 (lower boundary of the domain)
    const givenX = 0;

    // WHEN computing regularizedIncompleteBeta with different a, b pairs
    const actualResult1 = regularizedIncompleteBeta(1, 1, givenX);
    const actualResult2 = regularizedIncompleteBeta(2, 3, givenX);

    // THEN it always returns 0
    expect(actualResult1).toBe(0);
    expect(actualResult2).toBe(0);
  });

  test("should return 1 when x is 1 for any a, b", () => {
    // GIVEN x = 1 (upper boundary of the domain)
    const givenX = 1;

    // WHEN computing regularizedIncompleteBeta with different a, b pairs
    const actualResult1 = regularizedIncompleteBeta(1, 1, givenX);
    const actualResult2 = regularizedIncompleteBeta(2, 3, givenX);

    // THEN it always returns 1
    expect(actualResult1).toBe(1);
    expect(actualResult2).toBe(1);
  });

  test("should return 0.5 when x is 0.5 and a=1, b=1 (uniform distribution)", () => {
    // GIVEN a=1, b=1 (uniform distribution) and x=0.5
    const givenA = 1;
    const givenB = 1;
    const givenX = 0.5;
    const expectedResult = 0.5;

    // WHEN computing regularizedIncompleteBeta
    const actualResult = regularizedIncompleteBeta(givenA, givenB, givenX);

    // THEN it returns 0.5 (CDF of uniform at midpoint)
    expect(actualResult).toBeCloseTo(expectedResult, 10);
  });

  test("should return 0.5 when x is 0.5 and a=2, b=2 (symmetric beta)", () => {
    // GIVEN a=2, b=2 (symmetric beta distribution) and x=0.5
    const givenA = 2;
    const givenB = 2;
    const givenX = 0.5;
    const expectedResult = 0.5;

    // WHEN computing regularizedIncompleteBeta
    const actualResult = regularizedIncompleteBeta(givenA, givenB, givenX);

    // THEN it returns 0.5 (symmetric distribution at midpoint)
    expect(actualResult).toBeCloseTo(expectedResult, 10);
  });

  test("should return known reference value when a=2, b=5, x=0.3", () => {
    // GIVEN a=2, b=5, x=0.3 (reference value I_0.3(2,5) = 0.57969)
    const givenA = 2;
    const givenB = 5;
    const givenX = 0.3;
    const expectedResult = 0.57969;

    // WHEN computing regularizedIncompleteBeta
    const actualResult = regularizedIncompleteBeta(givenA, givenB, givenX);

    // THEN it matches the known reference value
    expect(actualResult).toBeCloseTo(expectedResult, 3);
  });

  test("should use symmetry relation when x is large", () => {
    // GIVEN x=0.8 which exceeds the threshold (a+1)/(a+b+2)=0.333, triggering symmetry
    const givenA = 2;
    const givenB = 5;
    const givenX = 0.8;

    // WHEN computing regularizedIncompleteBeta via the symmetry path
    const actualResult = regularizedIncompleteBeta(givenA, givenB, givenX);

    // THEN the result is very close to 1
    expect(actualResult).toBeGreaterThan(0.99);
    expect(actualResult).toBeLessThanOrEqual(1);
  });

  test("should throw an error when x is outside [0, 1]", () => {
    // GIVEN x values outside the valid [0, 1] range
    const givenXBelow = -0.1;
    const givenXAbove = 1.1;

    // WHEN computing regularizedIncompleteBeta with out-of-range x,
    // THEN a descriptive error is thrown
    expect(() => regularizedIncompleteBeta(1, 1, givenXBelow)).toThrow("x must be in [0, 1]");
    expect(() => regularizedIncompleteBeta(1, 1, givenXAbove)).toThrow("x must be in [0, 1]");
  });
});

describe("Test tDistCDF function", () => {
  test("should return 0.5 when t is 0 for any degrees of freedom", () => {
    // GIVEN t = 0 (the symmetric center of the distribution)
    const givenT = 0;

    // WHEN computing tDistCDF with various degrees of freedom
    const actualResult1 = tDistCDF(givenT, 1);
    const actualResult10 = tDistCDF(givenT, 10);
    const actualResult100 = tDistCDF(givenT, 100);

    // THEN it always returns 0.5 (symmetry of t-distribution)
    expect(actualResult1).toBe(0.5);
    expect(actualResult10).toBe(0.5);
    expect(actualResult100).toBe(0.5);
  });

  test("should return 0.75 when t is 1 and df is 1 (Cauchy distribution)", () => {
    // GIVEN t = 1, df = 1 (Cauchy: CDF(1) = 0.5 + arctan(1)/pi = 0.75)
    const givenT = 1;
    const givenDf = 1;
    const expectedResult = 0.75;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it returns 0.75
    expect(actualResult).toBeCloseTo(expectedResult, 4);
  });

  test("should return 0.25 when t is -1 and df is 1 (Cauchy symmetry)", () => {
    // GIVEN t = -1, df = 1 (symmetric counterpart of t = 1)
    const givenT = -1;
    const givenDf = 1;
    const expectedResult = 0.25;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it returns 0.25 (1 - 0.75 by symmetry)
    expect(actualResult).toBeCloseTo(expectedResult, 4);
  });

  test("should approach 1 when t is large and positive", () => {
    // GIVEN t = 100 (extreme positive tail) with df = 10
    const givenT = 100;
    const givenDf = 10;
    const expectedResult = 1;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it approaches 1
    expect(actualResult).toBeCloseTo(expectedResult, 6);
  });

  test("should approach 0 when t is large and negative", () => {
    // GIVEN t = -100 (extreme negative tail) with df = 10
    const givenT = -100;
    const givenDf = 10;
    const expectedResult = 0;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it approaches 0
    expect(actualResult).toBeCloseTo(expectedResult, 6);
  });

  test("should approximate 0.975 when t is 1.96 and df is large (normal approximation)", () => {
    // GIVEN t = 1.96, df = 1000 (large df approximates the standard normal)
    const givenT = 1.96;
    const givenDf = 1000;
    const expectedResult = 0.975;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it approximates the normal CDF value of 0.975
    expect(actualResult).toBeCloseTo(expectedResult, 2);
  });

  test("should approximate 0.025 when t is -1.96 and df is large", () => {
    // GIVEN t = -1.96, df = 1000 (large df approximates the standard normal)
    const givenT = -1.96;
    const givenDf = 1000;
    const expectedResult = 0.025;

    // WHEN computing tDistCDF
    const actualResult = tDistCDF(givenT, givenDf);

    // THEN it approximates the normal CDF value of 0.025
    expect(actualResult).toBeCloseTo(expectedResult, 2);
  });

  test("should throw an error when degrees of freedom is non-positive", () => {
    // GIVEN df = 0 and df = -1 (both invalid for t-distribution)
    const givenDfZero = 0;
    const givenDfNegative = -1;

    // WHEN computing tDistCDF with invalid df,
    // THEN a descriptive error is thrown
    expect(() => tDistCDF(0, givenDfZero)).toThrow("Degrees of freedom must be positive");
    expect(() => tDistCDF(0, givenDfNegative)).toThrow("Degrees of freedom must be positive");
  });
});

describe("Test welchTTest function", () => {
  function makeStats(data: number[]) {
    return calcStats(data);
  }

  test("should return small p-value when Function A is clearly faster than Function B", () => {
    // GIVEN two samples with clearly different means (Function A~5ms, Function B~15ms)
    const givenFunctionAStats = makeStats([5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5]);
    const givenFunctionBStats = makeStats([15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN the p-value is very small and the CI is entirely negative
    expect(actualResult.t).toBeLessThan(-10);
    expect(actualResult.pValue).toBeLessThan(0.001);
    expect(actualResult.meanDifference).toBeLessThan(0);
    expect(actualResult.df).toBeGreaterThan(0);
    expect(actualResult.standardError).toBeGreaterThan(0);
    expect(actualResult.confidenceInterval[1]).toBeLessThan(0);
  });

  test("should return p-value near 1 when Function A is clearly slower than Function B", () => {
    // GIVEN two samples where Function A~15ms is slower than Function B~5ms
    const givenFunctionAStats = makeStats([15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15]);
    const givenFunctionBStats = makeStats([5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN the p-value is near 1 (one-tailed: Function A is not faster)
    expect(actualResult.t).toBeGreaterThan(10);
    expect(actualResult.pValue).toBeGreaterThan(0.999);
    expect(actualResult.meanDifference).toBeGreaterThan(0);
  });

  test("should return p-value near 0.5 when samples are identical", () => {
    // GIVEN two identical samples (same data, same distribution)
    const givenFunctionAStats = makeStats([10, 10.1, 9.9, 10.2, 9.8]);
    const givenFunctionBStats = makeStats([10, 10.1, 9.9, 10.2, 9.8]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN t is near 0, p is near 0.5, and CI spans zero
    expect(actualResult.t).toBeCloseTo(0, 5);
    expect(actualResult.pValue).toBeCloseTo(0.5, 2);
    expect(actualResult.meanDifference).toBeCloseTo(0, 5);
    expect(actualResult.confidenceInterval[0]).toBeLessThan(0);
    expect(actualResult.confidenceInterval[1]).toBeGreaterThan(0);
  });

  test("should return p-value near 0.5 when means are equal but variances differ", () => {
    // GIVEN two samples with equal means but different variances
    const givenFunctionAStats = makeStats([9.5, 10, 10.5, 10, 10]);
    const givenFunctionBStats = makeStats([5, 10, 15, 10, 10]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN p is near 0.5 and mean difference is near 0
    expect(actualResult.pValue).toBeCloseTo(0.5, 1);
    expect(actualResult.meanDifference).toBeCloseTo(0, 5);
  });

  test("should detect significance when samples are small (n=2 each)", () => {
    // GIVEN two small samples (n=2 each) with clearly different means
    const givenFunctionAStats = makeStats([5, 6]);
    const givenFunctionBStats = makeStats([10, 11]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN the difference is statistically significant even with small n
    expect(actualResult.t).toBeLessThan(0);
    expect(actualResult.pValue).toBeLessThan(0.05);
    expect(actualResult.df).toBeGreaterThan(0);
  });

  test("should return t=0 and p=0.5 when both stddev are 0 and means are equal", () => {
    // GIVEN two constant samples with identical means (zero variance)
    const givenFunctionAStats = makeStats([10, 10, 10]);
    const givenFunctionBStats = makeStats([10, 10, 10]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN t = 0, p = 0.5, and SE = 0 (no difference, no variance)
    expect(actualResult.t).toBe(0);
    expect(actualResult.pValue).toBe(0.5);
    expect(actualResult.meanDifference).toBe(0);
    expect(actualResult.standardError).toBe(0);
  });

  test("should return t=-Infinity and p=0 when both stddev are 0 and Function A is faster", () => {
    // GIVEN two constant samples where Function A (mean=5) is faster than Function B (mean=10)
    const givenFunctionAStats = makeStats([5, 5, 5]);
    const givenFunctionBStats = makeStats([10, 10, 10]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN t = -Infinity, and p = 0 (perfect separation, Function A is definitively faster)
    expect(actualResult.t).toBe(-Infinity);
    expect(actualResult.pValue).toBe(0);
    expect(actualResult.meanDifference).toBe(-5);
  });

  test("should return t=Infinity and p=1 when both stddev are 0 and Function A is slower", () => {
    // GIVEN two constant samples where Function A (mean=10) is slower than Function B (mean=5)
    const givenFunctionAStats = makeStats([10, 10, 10]);
    const givenFunctionBStats = makeStats([5, 5, 5]);
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN t = Infinity, and p = 1 (Function A is definitively slower)
    expect(actualResult.t).toBe(Infinity);
    expect(actualResult.pValue).toBe(1);
    expect(actualResult.meanDifference).toBe(5);
  });

  test("should produce wider CI when confidence level is higher", () => {
    // GIVEN two samples with a small mean difference (~1ms)
    const givenFunctionAStats = makeStats([5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5]);
    const givenFunctionBStats = makeStats([6, 6.1, 5.9, 6.2, 5.8, 6, 6.1, 5.9, 6, 6]);

    // WHEN performing Welch's t-test at 90% and 99% confidence
    const actualResult90 = welchTTest(givenFunctionAStats, givenFunctionBStats, 0.90);
    const actualResult99 = welchTTest(givenFunctionAStats, givenFunctionBStats, 0.99);

    // THEN the 99% CI is wider than the 90% CI
    const actualWidth90 = actualResult90.confidenceInterval[1] - actualResult90.confidenceInterval[0];
    const actualWidth99 = actualResult99.confidenceInterval[1] - actualResult99.confidenceInterval[0];
    expect(actualWidth99).toBeGreaterThan(actualWidth90);
  });

  test("should throw an error when statsA has n=1 (null stddev)", () => {
    // GIVEN statsA with n=1 (stddev is null, t-test requires n >= 2)
    const givenFunctionAStats = calcStats([10]); // n=1, stddev is null
    const givenFunctionBStats = makeStats([10, 11, 12]);

    // WHEN performing Welch's t-test,
    // THEN a descriptive error is thrown
    expect(() => welchTTest(givenFunctionAStats, givenFunctionBStats, 0.95)).toThrow("Stats A must have n >= 2");
  });

  test("should throw an error when statsB has n=1 (null stddev)", () => {
    // GIVEN statsB with n=1 (stddev is null, t-test requires n >= 2)
    const givenFunctionAStats = makeStats([10, 11, 12]);
    const givenFunctionBStats = calcStats([10]); // n=1, stddev is null

    // WHEN performing Welch's t-test,
    // THEN a descriptive error is thrown
    expect(() => welchTTest(givenFunctionAStats, givenFunctionBStats, 0.95)).toThrow("Stats B must have n >= 2");
  });

  test("should throw an error when confidence is out of range", () => {
    // GIVEN valid stats but confidence at boundaries (0 and 1, both invalid)
    const givenFunctionAStats = makeStats([10, 11, 12]);
    const givenFunctionBStats = makeStats([10, 11, 12]);

    // WHEN performing Welch's t-test with invalid confidence,
    // THEN a descriptive error is thrown
    expect(() => welchTTest(givenFunctionAStats, givenFunctionBStats, 0)).toThrow("confidence must be between 0 (exclusive) and 1 (exclusive)");
    expect(() => welchTTest(givenFunctionAStats, givenFunctionBStats, 1)).toThrow("confidence must be between 0 (exclusive) and 1 (exclusive)");
  });

  test("should handle one zero-variance sample and one non-zero variance", () => {
    // GIVEN one constant sample (Function A=5, variance=0) and one variable sample (Function B~12)
    const givenFunctionAStats = makeStats([5, 5, 5, 5, 5]); // constant, variance=0
    const givenFunctionBStats = makeStats([10, 11, 12, 13, 14]); // variable
    const givenConfidence = 0.95;

    // WHEN performing Welch's t-test
    const actualResult = welchTTest(givenFunctionAStats, givenFunctionBStats, givenConfidence);

    // THEN the test detects Function A is significantly faster despite asymmetric variance
    expect(actualResult.t).toBeLessThan(0);
    expect(actualResult.pValue).toBeLessThan(0.05);
    expect(actualResult.df).toBeGreaterThan(0);
    expect(actualResult.standardError).toBeGreaterThan(0);
  });
});
