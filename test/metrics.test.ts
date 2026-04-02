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
        ["an empty array", []]
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
});

describe("Test calcStats function", () => {
    test("should calculate stats for a simple dataset", () => {
        const stats = calcStats([1, 2, 3, 4, 5]);
        expect(stats.min).toBe(1);
        expect(stats.max).toBe(5);
        expect(stats.mean).toBe(3);
        expect(stats.median).toBe(3);
        expect(stats.stddev).toBeCloseTo(Math.sqrt(2), 10);
    });

    test("should calculate stats for a single value", () => {
        const stats = calcStats([42]);
        expect(stats.min).toBe(42);
        expect(stats.max).toBe(42);
        expect(stats.mean).toBe(42);
        expect(stats.median).toBe(42);
        expect(stats.stddev).toBe(0);
    });

    test("should calculate stats for identical values", () => {
        const stats = calcStats([10, 10, 10]);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(10);
        expect(stats.mean).toBe(10);
        expect(stats.median).toBe(10);
        expect(stats.stddev).toBe(0);
    });

    test("should not mutate the input array", () => {
        const data = [3, 1, 2];
        calcStats(data);
        expect(data).toEqual([3, 1, 2]);
    });
});
