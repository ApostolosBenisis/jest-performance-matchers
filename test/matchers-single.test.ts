import '../src/main';
import {printExpected, printReceived} from 'jest-matcher-utils';
import {mockFunctionProcessTime} from './test-utils';

describe("Test jest expect.toCompleteWithin assertion", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  })

  test("Should pass the assertion", () => {
    // GIVEN a function that completes within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting that it completes within the threshold
    // THEN expect success
    expect(() => undefined).toCompleteWithin(givenDuration);
  });

  test("Should fail the assertion", () => {
    // GIVEN a function that completes within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting with a threshold below the actual duration
    // THEN expect to fail
    expect(() => {
      expect(() => undefined).toCompleteWithin(givenDuration - 1);
    }).toThrowError(`expected function duration ${printReceived(givenDuration)} (ms) to be less or equal to ${printExpected(givenDuration - 1)} (ms)`);
  });

  test("Should not to pass the assertion", () => {
    // GIVEN a function that completes within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting with .not negation that it does not complete within the threshold
    // THEN expect to fail
    expect(() => {
      expect(() => undefined).not.toCompleteWithin(givenDuration);
    }).toThrowError(`expected function duration ${printReceived(givenDuration)} (ms) to be greater than ${printExpected(givenDuration)} (ms)`);
  });

  test("Should call the callback", () => {
    // GIVEN a function that completes within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);
    const mockFn = jest.fn();

    // WHEN asserting toCompleteWithin
    expect(mockFn).toCompleteWithin(givenDuration);
    // THEN expect the function to have been called once
    expect(mockFn).toBeCalledTimes(1);
  });
});

describe("Setup/teardown options for toCompleteWithin", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should call setup before timing and teardown after when both hooks are provided", () => {
    // GIVEN a callback with setup and teardown hooks that record their call order
    const actualCallOrder: string[] = [];
    jest.spyOn(process, "hrtime").mockImplementation(() => {
      actualCallOrder.push('hrtime');
      return [1, 0];
    });

    // WHEN asserting toCompleteWithin with both hooks
    expect(() => {
      actualCallOrder.push('callback');
    }).toCompleteWithin(1000, {
      setup: () => {
        actualCallOrder.push('setup');
      },
      teardown: () => {
        actualCallOrder.push('teardown');
      },
    });

    // THEN the call order is setup → hrtime(t0) → callback → hrtime(t1) → teardown
    const expectedCallOrder = ['setup', 'hrtime', 'callback', 'hrtime', 'teardown'];
    expect(actualCallOrder).toEqual(expectedCallOrder);
  });

  test("should propagate setup error immediately when setup throws", () => {
    // GIVEN a function that completes within the budget
    mockFunctionProcessTime(10);
    const givenSetupError = "foo-setup-error";

    // WHEN setup throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithin(10, {
        setup: () => {
          throw new Error(givenSetupError);
        },
      });
    }).toThrowError(givenSetupError);
  });

  test("should propagate teardown error immediately when teardown throws", () => {
    // GIVEN a function that completes within the budget
    mockFunctionProcessTime(10);
    const givenTeardownError = "foo-teardown-error";

    // WHEN teardown throws an error
    // THEN the error propagates immediately
    expect(() => {
      expect(() => undefined).toCompleteWithin(10, {
        teardown: () => {
          throw new Error(givenTeardownError);
        },
      });
    }).toThrowError(givenTeardownError);
  });

  test("should pass the assertion when no options are provided (backward compatible)", () => {
    // GIVEN a function that completes within the budget
    mockFunctionProcessTime(10);

    // WHEN asserting toCompleteWithin without options
    // THEN expect success (backward compatible)
    expect(() => undefined).toCompleteWithin(10);
  });

  test("should throw validation error when setup is not a function", () => {
    // GIVEN an invalid setup value that is not a function
    const givenInvalidSetup = 42;

    // WHEN asserting toCompleteWithin with the invalid setup,
    // THEN a validation error is thrown
    expect(() => {
      // @ts-expect-error - intentionally passing invalid setup for testing
      expect(() => undefined).toCompleteWithin(10, {setup: givenInvalidSetup});
    }).toThrowError("jest-performance-matchers: setup must be a function if provided, received number");
  });

  test("should throw validation error when teardown is not a function", () => {
    // GIVEN an invalid teardown value that is not a function
    const givenInvalidTeardown = "foo-not-a-function";

    // WHEN asserting toCompleteWithin with the invalid teardown,
    // THEN a validation error is thrown
    expect(() => {
      // @ts-expect-error - intentionally passing invalid teardown for testing
      expect(() => undefined).toCompleteWithin(10, {teardown: givenInvalidTeardown});
    }).toThrowError("jest-performance-matchers: teardown must be a function if provided, received string");
  });

  test("should pass setup return value to callback and teardown when setup returns a value", () => {
    // GIVEN a function with setup that returns data
    mockFunctionProcessTime(10);
    const givenSetupData = ["foo-item-1", "foo-item-2"];
    const actualCallbackArgs: unknown[] = [];
    const actualTeardownArgs: unknown[] = [];

    // WHEN asserting toCompleteWithin with setup that returns a value
    expect((data: unknown) => {
      actualCallbackArgs.push(data);
    }).toCompleteWithin(10, {
      setup: () => givenSetupData,
      teardown: (data) => {
        actualTeardownArgs.push(data);
      },
    });

    // THEN the callback receives the setup return value
    const expectedArgs = [givenSetupData];
    expect(actualCallbackArgs).toEqual(expectedArgs);
    // AND the teardown receives the same value
    expect(actualTeardownArgs).toEqual(expectedArgs);
  });

  test("should pass undefined to callback when no setup is provided", () => {
    // GIVEN a function with no setup hook
    mockFunctionProcessTime(10);
    const actualCallbackArgs: unknown[] = [];

    // WHEN asserting toCompleteWithin without setup
    expect((data: unknown) => {
      actualCallbackArgs.push(data);
    }).toCompleteWithin(10);

    // THEN the callback receives undefined as the state argument
    expect(actualCallbackArgs).toEqual([undefined]);
  });

  test("should call teardown when no setup is provided (teardown-only)", () => {
    // GIVEN a function with only a teardown hook (no setup)
    mockFunctionProcessTime(10);
    const givenTeardownFn = jest.fn();

    // WHEN asserting toCompleteWithin with only teardown
    expect(() => undefined).toCompleteWithin(10, {
      teardown: givenTeardownFn,
    });

    // THEN teardown is called once
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives undefined since no setup was provided
    expect(givenTeardownFn).toHaveBeenCalledWith(undefined);
  });

  test("should still call teardown when callback throws", () => {
    // GIVEN a callback that throws and a teardown hook
    mockFunctionProcessTime(10);
    const givenSetupState = "foo-state";
    const givenTeardownFn = jest.fn();
    const givenCallbackError = "foo-callback-error";

    // WHEN the callback throws an error
    expect(() => {
      expect(() => {
        throw new Error(givenCallbackError);
      }).toCompleteWithin(10, {
        setup: () => givenSetupState,
        teardown: givenTeardownFn,
      });
    }).toThrowError(givenCallbackError);

    // THEN teardown is still called via try/finally with the setup state
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the setup return value
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSetupState);
  });

  test("should call teardown and throw negation error when .not is used with setup/teardown hooks", () => {
    // GIVEN a function that completes within the budget and has setup/teardown hooks
    mockFunctionProcessTime(10);
    const givenSetupState = "foo-state";
    const givenTeardownFn = jest.fn();

    // WHEN using .not negation (expecting the assertion to fail)
    expect(() => {
      expect(() => undefined).not.toCompleteWithin(10, {
        setup: () => givenSetupState,
        teardown: givenTeardownFn,
      });
    }).toThrowError(/to be greater than/);

    // THEN teardown is still called despite the negation error
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the setup return value
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSetupState);
  });
});

describe("Test jest expect.toResolveWithin assertion", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  })

  test("Should pass the assertion (async)", async () => {
    // GIVEN an async function that resolves within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting that it resolves within the threshold
    // THEN expect success
    await expect(async () => await Promise.resolve()).toResolveWithin(givenDuration);
  });

  test("Should pass the assertion (promise)", async () => {
    // GIVEN an async function that resolves within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting that it resolves within the threshold
    // THEN expect success
    await expect(() => Promise.resolve()).toResolveWithin(givenDuration);
  });

  test("Should fail the assertion", async () => {
    // GIVEN an async function that resolves within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting with a threshold below the actual duration
    // THEN expect to fail
    await expect(async () => {
      await expect(async () => await Promise.resolve()).toResolveWithin(givenDuration - 1);
    }).rejects.toThrowError(`expected function duration ${printReceived(givenDuration)} (ms) to be less or equal to ${printExpected(givenDuration - 1)} (ms)`);
  });

  test("Should not to pass the assertion", async () => {
    // GIVEN an async function that resolves within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);

    // WHEN asserting with .not negation that it does not resolve within the threshold
    // THEN expect to fail
    await expect(async () => {
      await expect(async () => await Promise.resolve()).not.toResolveWithin(givenDuration);
    }).rejects.toThrowError(`expected function duration ${printReceived(givenDuration)} (ms) to be greater than ${printExpected(givenDuration)} (ms)`);
  });

  test("Should fail the assertion if the promise is rejected", async () => {
    // GIVEN an async function that rejects instead of resolving
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);
    const givenRejectionReason = "foo-rejection-reason";

    // WHEN asserting that it resolves within the threshold,
    // THEN the rejection propagates as a failure
    await expect(async () => {
      await expect(async () => Promise.reject(givenRejectionReason)).toResolveWithin(givenDuration);
    }).rejects.toEqual(givenRejectionReason);
  });

  test("Should call the callback", async () => {
    // GIVEN an async function that resolves within the given duration
    const givenDuration = 10;
    mockFunctionProcessTime(givenDuration);
    const mockFn = jest.fn(() => Promise.resolve());

    // WHEN asserting toResolveWithin
    await expect(mockFn).toResolveWithin(givenDuration);
    // THEN expect the promise to have been called once
    expect(mockFn).toBeCalledTimes(1);
  });
});

describe("Setup/teardown options for toResolveWithin", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should call setup before timing and teardown after when both hooks are provided", async () => {
    // GIVEN a promise with setup and teardown hooks that record their call order
    const actualCallOrder: string[] = [];
    jest.spyOn(process, "hrtime").mockImplementation(() => {
      actualCallOrder.push('hrtime');
      return [1, 0];
    });

    // WHEN asserting toResolveWithin with both hooks
    await expect(async () => {
      actualCallOrder.push('callback');
    }).toResolveWithin(1000, {
      setup: () => {
        actualCallOrder.push('setup');
      },
      teardown: () => {
        actualCallOrder.push('teardown');
      },
    });

    // THEN the call order is setup → hrtime(t0) → callback → hrtime(t1) → teardown
    const expectedCallOrder = ['setup', 'hrtime', 'callback', 'hrtime', 'teardown'];
    expect(actualCallOrder).toEqual(expectedCallOrder);
  });

  test("should await async setup and teardown when both return Promises", async () => {
    // GIVEN a promise with async setup and teardown hooks
    mockFunctionProcessTime(10);
    const actualOrder: string[] = [];

    // WHEN asserting toResolveWithin with async hooks
    await expect(async () => {
      actualOrder.push('callback');
    }).toResolveWithin(10, {
      setup: async () => {
        actualOrder.push('setup');
      },
      teardown: async () => {
        actualOrder.push('teardown');
      },
    });

    // THEN setup and teardown are awaited in order
    const expectedOrder = ['setup', 'callback', 'teardown'];
    expect(actualOrder).toEqual(expectedOrder);
  });

  test("should propagate async setup rejection immediately when setup rejects", async () => {
    // GIVEN a promise that resolves within the budget
    mockFunctionProcessTime(10);
    const givenSetupError = "foo-async-setup-error";

    // WHEN async setup rejects,
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithin(10, {
        setup: async () => {
          throw new Error(givenSetupError);
        },
      })
    ).rejects.toThrowError(givenSetupError);
  });

  test("should propagate async teardown rejection immediately when teardown rejects", async () => {
    // GIVEN a promise that resolves within the budget
    mockFunctionProcessTime(10);
    const givenTeardownError = "foo-async-teardown-error";

    // WHEN async teardown rejects
    // THEN the rejection propagates immediately
    await expect(
      expect(async () => await Promise.resolve()).toResolveWithin(10, {
        teardown: async () => {
          throw new Error(givenTeardownError);
        },
      })
    ).rejects.toThrowError(givenTeardownError);
  });

  test("should pass the assertion when no options are provided (backward compatible)", async () => {
    // GIVEN a promise that resolves within the budget
    mockFunctionProcessTime(10);

    // WHEN asserting toResolveWithin without options
    // THEN expect success (backward compatible)
    await expect(async () => await Promise.resolve()).toResolveWithin(10);
  });

  test("should throw validation error when setup is not a function", async () => {
    // GIVEN an invalid setup value that is not a function
    const givenInvalidSetup = 42;

    // WHEN asserting toResolveWithin with the invalid setup,
    // THEN a validation error is thrown
    await expect(async () => {
      // @ts-expect-error - intentionally passing invalid setup for testing
      await expect(async () => Promise.resolve()).toResolveWithin(10, {setup: givenInvalidSetup});
    }).rejects.toThrowError("jest-performance-matchers: setup must be a function if provided, received number");
  });

  test("should throw validation error when teardown is not a function", async () => {
    // GIVEN an invalid teardown value that is not a function
    const givenInvalidTeardown = "foo-not-a-function";

    // WHEN asserting toResolveWithin with the invalid teardown,
    // THEN a validation error is thrown
    await expect(async () => {
      // @ts-expect-error - intentionally passing invalid teardown for testing
      await expect(async () => Promise.resolve()).toResolveWithin(10, {teardown: givenInvalidTeardown});
    }).rejects.toThrowError("jest-performance-matchers: teardown must be a function if provided, received string");
  });

  test("should pass setup return value to callback and teardown when setup returns a value", async () => {
    // GIVEN a promise with setup that returns data
    mockFunctionProcessTime(10);
    const givenSetupData = {key: "foo-value"};
    const actualCallbackArgs: unknown[] = [];
    const actualTeardownArgs: unknown[] = [];

    // WHEN asserting toResolveWithin with setup that returns a value
    await expect(async (data: unknown) => {
      actualCallbackArgs.push(data);
    }).toResolveWithin(10, {
      setup: () => givenSetupData,
      teardown: (data) => {
        actualTeardownArgs.push(data);
      },
    });

    // THEN the callback receives the setup return value
    const expectedArgs = [givenSetupData];
    expect(actualCallbackArgs).toEqual(expectedArgs);
    // AND the teardown receives the same value
    expect(actualTeardownArgs).toEqual(expectedArgs);
  });

  test("should pass resolved value to callback and teardown when async setup returns a Promise", async () => {
    // GIVEN a promise with async setup that resolves to a value
    mockFunctionProcessTime(10);
    const givenResolvedValue = "foo-async-result";
    const actualCallbackArgs: unknown[] = [];
    const actualTeardownArgs: unknown[] = [];

    // WHEN asserting toResolveWithin with async setup
    await expect(async (data: unknown) => {
      actualCallbackArgs.push(data);
    }).toResolveWithin(10, {
      setup: async () => givenResolvedValue,
      teardown: (data) => {
        actualTeardownArgs.push(data);
      },
    });

    // THEN the callback receives the resolved value
    const expectedArgs = [givenResolvedValue];
    expect(actualCallbackArgs).toEqual(expectedArgs);
    // AND the teardown receives the same resolved value
    expect(actualTeardownArgs).toEqual(expectedArgs);
  });

  test("should pass undefined to callback when no setup is provided", async () => {
    // GIVEN a promise with no setup hook
    mockFunctionProcessTime(10);
    const actualCallbackArgs: unknown[] = [];

    // WHEN asserting toResolveWithin without setup
    await expect(async (data: unknown) => {
      actualCallbackArgs.push(data);
    }).toResolveWithin(10);

    // THEN the callback receives undefined as the state argument
    expect(actualCallbackArgs).toEqual([undefined]);
  });

  test("should call teardown when no setup is provided (teardown-only)", async () => {
    // GIVEN a promise with only a teardown hook (no setup)
    mockFunctionProcessTime(10);
    const givenTeardownFn = jest.fn();

    // WHEN asserting toResolveWithin with only teardown
    await expect(async () => await Promise.resolve()).toResolveWithin(10, {
      teardown: givenTeardownFn,
    });

    // THEN teardown is called once
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives undefined since no setup was provided
    expect(givenTeardownFn).toHaveBeenCalledWith(undefined);
  });

  test("should still call teardown when promise rejects", async () => {
    // GIVEN a promise that rejects and a teardown hook
    mockFunctionProcessTime(10);
    const givenSetupState = "foo-state";
    const givenTeardownFn = jest.fn();
    const givenPromiseError = "foo-promise-error";

    // WHEN the promise rejects
    await expect(
      expect(async () => {
        throw new Error(givenPromiseError);
      }).toResolveWithin(10, {
        setup: () => givenSetupState,
        teardown: givenTeardownFn,
      })
    ).rejects.toThrowError(givenPromiseError);

    // THEN teardown is still called via try/finally with the setup state
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the setup return value
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSetupState);
  });

  test("should call teardown and reject with negation error when .not is used with setup/teardown hooks", async () => {
    // GIVEN a promise that resolves within the budget and has setup/teardown hooks
    mockFunctionProcessTime(10);
    const givenSetupState = "foo-state";
    const givenTeardownFn = jest.fn();

    // WHEN using .not negation (expecting the assertion to fail)
    await expect(async () => {
      await expect(async () => await Promise.resolve()).not.toResolveWithin(10, {
        setup: () => givenSetupState,
        teardown: givenTeardownFn,
      });
    }).rejects.toThrowError(/to be greater than/);

    // THEN teardown is still called despite the negation error
    expect(givenTeardownFn).toHaveBeenCalledTimes(1);
    // AND teardown receives the setup return value
    expect(givenTeardownFn).toHaveBeenCalledWith(givenSetupState);
  });
});
