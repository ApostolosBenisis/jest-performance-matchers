import '../src/main';
import * as metrics from '../src/metrics';
import {printExpected, printReceived} from "jest-matcher-utils";


function mockFunctionProcessTime(milliseconds: number) {
    mockFunctionProcessTimes([milliseconds]);
    /*
    let calledTimes = 0;
    jest.spyOn(process, "hrtime").mockImplementation(() => {
        calledTimes++;
        if (calledTimes === 1) {
            return [1, 0];
        }
        return [1, 1000000 * milliseconds];
    });*/
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
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the function will complete in (T) - 1 milliseconds
        // THEN expect to fail
        const Q = 1

        expect(() => {
            expect(() => undefined).toCompleteWithinQuantile(T - 1, {iterations: I, quantile: Q});
        }).toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be less or equal to ${printExpected(T - 1)} (ms),\ninstead it was ${printReceived(T)} (ms)\nDurations:${T_Array}`);
    });

    test("Should not to pass the assertion", () => {
        // GIVEN a function takes (T) milliseconds to complete each of the (I) times it will be called
        const T = 10;
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the function will complete in (T) - 1 milliseconds
        // THEN expect to fail
        const Q = 1

        expect(() => {
            expect(() => undefined).not.toCompleteWithinQuantile(T, {iterations: I, quantile: Q});
        }).toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be greater than ${printExpected(T)} (ms),\ninstead it was ${printReceived(T)} (ms)\nDurations:${T_Array}`);
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
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will resolve in (T) - 1 milliseconds
        // THEN expect to fail
        const Q = 1
        await expect(async () => {
            await expect(() => Promise.resolve()).toResolveWithinQuantile(T - 1, {iterations: I, quantile: Q});
        }).rejects.toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be less or equal to ${printExpected(T - 1)} (ms),\ninstead it was ${printReceived(T)} (ms)\nDurations:${T_Array}`);
    });

    test("Should not to pass the assertion", async () => {
        // GIVEN a promise takes (T) milliseconds to resolve each of the (I) times it will be called
        const T = 10;
        const I = 5
        const T_Array = Array(I).fill(T);
        mockFunctionProcessTimes(T_Array);

        // WHEN asserting that (Q%) of the times when running for (I) iterations, the promise will not resolve in (T) milliseconds
        // THEN expect to fail
        const Q = 1
        await expect(async () => {
            await expect(() => Promise.resolve()).not.toResolveWithinQuantile(T, {iterations: I, quantile: Q});
        }).rejects.toThrowError(`expected that ${Q}% of the time when running ${I} iterations,\nthe function duration to be greater than ${printExpected(T)} (ms),\ninstead it was ${printReceived(T)} (ms)\nDurations:${T_Array}`);
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
});