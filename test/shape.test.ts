import {calcShapeDiagnostics} from "../src/shape";
import {calcStats} from "../src/metrics";

describe("Test calcShapeDiagnostics function", () => {

    describe("Input validation", () => {
        test.each([
            ["undefined", undefined],
            ["null", null],
            ["not an array", "string"],
            ["not an array of numbers", ["1", "2", "3"]],
            ["an empty array", []],
            ["an array containing NaN", [1, NaN, 3]],
            // eslint-disable-next-line no-sparse-arrays
            ["a sparse array", [1, , 3]],
        ])("should throw an error when data is %s", (description, data) => {
            // @ts-expect-error - intentionally passing invalid data for testing
            expect(() => calcShapeDiagnostics(data, null, null)).toThrowError(/Data must be an array of numbers and must contain at least one element/);
        });
    });

    describe("Shape label classification", () => {
        test("should classify as 'insufficient data' for n=1", () => {
            const result = calcShapeDiagnostics([42], null, null);
            expect(result.label).toBe("insufficient data");
        });

        test("should classify as 'insufficient data' for n=2 (Rule 1: n < 3 guard)", () => {
            const stats = calcStats([10, 20]);
            const result = calcShapeDiagnostics([10, 20], null, stats.stddev);
            expect(result.label).toBe("insufficient data");
        });

        test("should classify as 'insufficient data' when skewness is null but stddev and n >= 3", () => {
            // Rule 3: skewness null with non-null non-zero stddev and n >= 3.
            // stddev=1.0 is intentionally decoupled from the data — we are testing
            // the null-skewness guard, not the statistical correctness of stddev.
            const result = calcShapeDiagnostics([1, 2, 3], null, 1.0);
            expect(result.label).toBe("insufficient data");
        });

        test("should classify as 'insufficient data' when stddev is null", () => {
            const result = calcShapeDiagnostics([1, 2, 3], null, null);
            expect(result.label).toBe("insufficient data");
        });

        test("should classify as 'constant' for identical values (n >= 3)", () => {
            const result = calcShapeDiagnostics([5, 5, 5], null, 0);
            expect(result.label).toBe("constant");
        });

        test("should classify as 'symmetric' for symmetric data", () => {
            const stats = calcStats([1, 2, 3, 4, 5]);
            const result = calcShapeDiagnostics([1, 2, 3, 4, 5], stats.skewness, stats.stddev);
            expect(result.label).toBe("symmetric");
        });

        test("should classify as 'symmetric' at skewness boundary 0.5", () => {
            const result = calcShapeDiagnostics([1, 2, 3, 4, 5], 0.5, 1.0);
            expect(result.label).toBe("symmetric");
        });

        test("should classify as 'symmetric' at skewness boundary -0.5", () => {
            const result = calcShapeDiagnostics([1, 2, 3, 4, 5], -0.5, 1.0);
            expect(result.label).toBe("symmetric");
        });

        test("should classify as 'right-skewed' for skewness > 0.5", () => {
            const data = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 7, 8, 9, 10, 12];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(stats.skewness!).toBeGreaterThan(0.5);
            expect(result.label).toBe("right-skewed");
        });

        test("should classify as 'left-skewed' for skewness < -0.5", () => {
            const data = [2, 4, 6, 7, 8, 9, 9, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 13, 13, 14];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(stats.skewness!).toBeLessThan(-0.5);
            expect(result.label).toBe("left-skewed");
        });

        test("should classify as 'bimodal' for bimodal data with n >= 5", () => {
            // Two well-separated clusters: 5 values at 1, 5 values at 100
            const data = [1, 1, 1, 1, 1, 100, 100, 100, 100, 100];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.label).toBe("bimodal");
        });

        test("should not classify as 'bimodal' at n=4 (G2 guard prevents computation)", () => {
            // Even with bimodal-looking data, n=4 cannot compute kurtosis
            const data = [1, 1, 10, 10];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.label).not.toBe("bimodal");
        });

        test("should not classify as 'bimodal' for borderline data that is not well-separated", () => {
            // Two groups close together: not bimodal with correct kurtosis formula
            const data = [1, 1, 1, 1, 10, 10, 10, 10];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.label).not.toBe("bimodal");
        });

        test("should classify as 'right-skewed' when skewness is just above 0.5", () => {
            const result = calcShapeDiagnostics([1, 2, 3, 4, 5], 0.51, 1.0);
            expect(result.label).toBe("right-skewed");
        });

        test("should classify as 'left-skewed' when skewness is just below -0.5", () => {
            const result = calcShapeDiagnostics([1, 2, 3, 4, 5], -0.51, 1.0);
            expect(result.label).toBe("left-skewed");
        });
    });

    describe("Sparkline visual inspection", () => {
        test("normal distribution should show bell-shaped sparkline", () => {
            const data = [40,47,32,39,45,62,47,32,43,17,56,60,65,54,61,60,54,36,74,41,40,44,55,53,46,38,47,53,47,52,71,36,58,46,49,54,55,71,59,39,38,48,35,48,51,38,63,47,56,28,54,51,47,35,39,54,57,54,59,46,48,57,51,40,68,48,47,65,67,61,59,47,38,45,43,48,41,41,42,43,52,44,61,65,53,41,57,44,63,56,46,36,52,37,48,53,57,61,45,57];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Normal (n=${data.length}):       ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.label).toBe("symmetric");
            expect(result.sparkline).toHaveLength(10);
        });

        test("left-skewed distribution should show tail on the left", () => {
            const data = [84,76,85,68,85,82,70,90,33,81,78,83,83,48,90,82,78,87,88,89,86,68,81,88,87,46,50,56,90,68,91,84,69,80,77,76,74,49,82,84,66,93,83,85,54,80,71,81,76,91,86,87,66,80,88,73,67,65,86,73,72,74,57,82,79,82,66,84,65,68,86,88,87,63,56,72,82,41,84,67,70,83,91,91,81,87,88,75,71,47,90,78,81,83,68,77,76,86,53,86];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Left-skewed (n=${data.length}):  ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(stats.skewness!).toBeLessThan(-0.5);
            expect(result.sparkline).toHaveLength(10);
        });

        test("log-normal distribution should show right tail", () => {
            const data = [8.3,18.3,18.4,5,8.8,18,4.1,9.4,5.4,13.2,6,24.9,5.6,7.4,4.9,2.9,10.5,10.9,36.5,1.8,3.7,4.8,33.9,5.6,1.8,4.2,7.3,18.5,5.6,7.3,18.3,14.3,7.6,9.7,1.4,3.1,3,3,4.1,2.8,2.7,13.2,2.9,5.2,1.2,3,7.6,5.2,15.9,4.6,60.1,1.1,5,3.8,5.9,8.5,8,8.1,27.1,8.1,14.5,8.3,14.1,18,7.4,2.5,13.6,8.2,4.3,15.7,9.8,13.7,12.1,2.4,5.2,13.6,5.4,2.8,7.6,15.3,9.1,3.2,5.1,11,7.9,6.2,3.3,13.6,13.1,35.3,10.5,1,7,15.9,12.1,10.7,5.2,1.9,12,3.6];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Log-normal (n=${data.length}):   ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(stats.skewness!).toBeGreaterThan(0.5);
            expect(result.sparkline).toHaveLength(10);
        });

        test("bimodal distribution should show two peaks", () => {
            const data = [16,22,17,19,22,15,16,21,18,18,20,16,19,21,16,20,20,19,16,18,19,12,13,12,19,24,23,16,15,17,23,16,17,30,19,8,23,21,14,16,15,23,15,22,18,15,20,19,24,18,89,82,74,85,77,85,82,88,78,75,75,75,82,73,74,76,87,72,87,89,81,75,87,76,80,73,86,78,90,80,85,83,85,89,75,69,71,75,94,80,84,81,81,80,76,81,90,82,86,94];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Bimodal (n=${data.length}):      ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.label).toBe("bimodal");
            expect(result.sparkline).toHaveLength(10);
        });
    });

    describe("Sparkline visual inspection (small samples)", () => {
        test("normal n=5 (minimum for shape classification)", () => {
            const data = [49, 51, 36, 48, 59];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Normal (n=${data.length}):          ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.sparkline).toHaveLength(10);
        });

        test("normal n=10", () => {
            const data = [56, 46, 65, 74, 44, 63, 48, 56, 51, 48];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Normal (n=${data.length}):         ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.sparkline).toHaveLength(10);
        });

        test("normal n=20", () => {
            const data = [51, 52, 48, 66, 33, 43, 51, 43, 52, 44, 47, 49, 51, 57, 33, 49, 47, 44, 50, 44];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Normal (n=${data.length}):         ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.sparkline).toHaveLength(10);
        });

        test("right-skewed n=30", () => {
            const data = [10, 11.8, 3.4, 4.5, 10.7, 12, 3.7, 13, 7.5, 2.3, 11.5, 25.5, 5.3, 13, 3, 33.8, 5.7, 12.1, 8.7, 6.3, 19.2, 10.3, 26, 19.9, 5.4, 4.8, 1.9, 10.3, 3.5, 6.1];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Right-skewed (n=${data.length}):   ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(stats.skewness!).toBeGreaterThan(0.5);
            expect(result.sparkline).toHaveLength(10);
        });

        test("left-skewed n=15", () => {
            const data = [84, 63, 91, 81, 86, 87, 85, 83, 83, 76, 82, 80, 73, 81, 86];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Left-skewed (n=${data.length}):    ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(stats.skewness!).toBeLessThan(-0.5);
            expect(result.sparkline).toHaveLength(10);
        });

        test("bimodal n=20", () => {
            const data = [22, 20, 20, 19, 25, 17, 20, 16, 23, 18, 78, 87, 73, 78, 78, 83, 82, 75, 82, 83];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            // eslint-disable-next-line no-console
            console.log(`Bimodal (n=${data.length}):        ${result.sparkline}  [${result.label}, skewness=${stats.skewness?.toFixed(2)}]`);
            expect(result.label).toBe("bimodal");
            expect(result.sparkline).toHaveLength(10);
        });
    });

    describe("Sparkline generation", () => {
        test("should return single block for n=1", () => {
            const result = calcShapeDiagnostics([42], null, null);
            expect(result.sparkline).toBe('█');
        });

        test("should return all blocks for identical values", () => {
            const result = calcShapeDiagnostics([5, 5, 5], null, 0);
            expect(result.sparkline).toHaveLength(10);
            expect(result.sparkline).toBe('██████████');
        });

        test("should generate sparkline with length 10 for spread data", () => {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.sparkline).toHaveLength(10);
        });

        test("should show varied characters for non-uniform data", () => {
            const data = [1, 1, 1, 1, 5, 5, 10];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.sparkline).toHaveLength(10);
            // Should have at least 2 distinct characters
            const uniqueChars = new Set(result.sparkline.split(''));
            expect(uniqueChars.size).toBeGreaterThanOrEqual(2);
        });

        test("should show bars at extremes for clustered data", () => {
            const data = [1, 1, 1, 1, 1, 100, 100, 100, 100, 100];
            const stats = calcStats(data);
            const result = calcShapeDiagnostics(data, stats.skewness, stats.stddev);
            expect(result.sparkline).toHaveLength(10);
            // First and last characters should be non-space (bars at extremes)
            expect(result.sparkline[0]).not.toBe(' ');
            expect(result.sparkline[9]).not.toBe(' ');
        });
    });
});
