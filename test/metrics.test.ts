import {calcQuantile} from "../src/metrics";

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
        // @ts-ignore
        expect(calcQuantile(q, data)).toEqual(result);
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["not an array", "string"],
        ["not an array of numbers", ["NaN", "0.2"]],
        ["an empty array", []]
    ])("should throw an error when data is %s", (description, data) => {
        // @ts-ignore
        expect(() => calcQuantile(50, data)).toThrowError(/Data must be an array of numbers and must contain at least one element/);
    });
    test.each([
        ["undefined", undefined],
        ["null", null],
        ["NaN", "string"],
        ["not an integer", 0.1]
    ])("should throw an error when value is %s", (description, q) => {
        // @ts-ignore
        expect(() => calcQuantile(q, [])).toThrowError(/Quantile must be an integer greater than 0 and less than or equal to 100/);
    });
});