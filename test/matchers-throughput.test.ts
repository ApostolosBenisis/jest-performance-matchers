import '../src/main';
import {processThroughputResults} from '../src/helpers';
import {mockThroughputTimings} from './test-utils';
import {printExpected, printReceived} from "jest-matcher-utils";

describe("toAchieveOpsPerSecond", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass the assertion when function achieves target ops/sec", () => {
      // GIVEN a function that completes 5 operations within a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting it achieves at least 5 ops/sec
      // THEN the assertion passes
      expect(() => undefined).toAchieveOpsPerSecond(5, {duration: givenDuration});
    });

    test("should pass the assertion when warmup iterations are configured", () => {
      // GIVEN a function that completes 5 operations within a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with 2 warmup iterations before measurement
      // THEN the assertion passes
      expect(() => undefined).toAchieveOpsPerSecond(5, {duration: givenDuration, warmup: 2});
    });

    test("should pass the assertion when outlier removal is enabled", () => {
      // GIVEN a function where 9 operations are fast and 1 is an extreme outlier
      const givenOpDurations = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN the assertion passes based on total operations completed
      expect(() => undefined).toAchieveOpsPerSecond(10, {duration: givenDuration, outliers: 'remove'});
    });

    test("should default warmup to 0 when not specified", () => {
      // GIVEN a function that completes 5 operations within a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const givenCallback = jest.fn();

      // WHEN asserting without specifying warmup
      expect(givenCallback).toAchieveOpsPerSecond(5, {duration: givenDuration});

      // THEN the callback is called exactly once per operation with no extra warmup calls
      expect(givenCallback).toHaveBeenCalledTimes(5);
    });
  });

  describe("fail", () => {
    test("should fail the assertion when function does not achieve target ops/sec", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenExpectedOps = 10;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting a target of 10 ops/sec
      // THEN the assertion fails because the function is too slow
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(givenExpectedOps, {duration: givenDuration});
      }).toThrow(`expected function to achieve at least ${printExpected(givenExpectedOps)} ops/sec`);
    });

    test("should include diagnostic stats in failure message", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes throughput summary and per-operation diagnostics
      expect(actualMessage).toContain('Throughput:');
      expect(actualMessage).toContain('ops/sec');
      expect(actualMessage).toContain('Per-operation timing');
      expect(actualMessage).toContain('Interpretation:');
    });
  });

  describe(".not", () => {
    test("should pass with .not when function does not achieve target ops/sec", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting .not with a target well above actual throughput
      // THEN the negated assertion passes
      expect(() => undefined).not.toAchieveOpsPerSecond(10000, {duration: givenDuration});
    });

    test("should fail with .not when function exceeds target ops/sec", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenTarget = 1;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting .not with a target below actual throughput
      // THEN the negated assertion fails
      expect(() => {
        expect(() => undefined).not.toAchieveOpsPerSecond(givenTarget, {duration: givenDuration});
      }).toThrow(`expected function NOT to achieve at least ${printExpected(givenTarget)} ops/sec`);
    });
  });

  describe("diagnostics", () => {
    test("should show throughput summary in failure message", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes a throughput summary line
      expect(actualMessage).toContain('Throughput: 5 ops/sec over 1000ms (5 total operations)');
    });

    test("should show throughput CI in failure message", () => {
      // GIVEN a function that achieves approximately 5 ops/sec with slight per-op variance
      const givenOpDurations = [10, 10.1, 9.9, 10.2, 9.8];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes a throughput confidence interval
      expect(actualMessage).toMatch(/CI 95%: \[\d+, \d+\] ops\/sec/);
    });

    test("should show target shortfall info when below target", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails against a 10 ops/sec target
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message includes shortfall info
      expect(actualMessage).toContain('Target: 10 ops/sec');
      expect(actualMessage).toContain('shortfall of');
    });

    test("should show target surplus info when above target via .not", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the negated assertion fails because actual exceeds target
      let actualMessage = '';
      try {
        expect(() => undefined).not.toAchieveOpsPerSecond(1, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message includes surplus info
      expect(actualMessage).toContain('surplus of');
    });

    test("should show per-operation timing stats in failure message", () => {
      // GIVEN a function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes per-operation timing statistics
      expect(actualMessage).toContain('Per-operation timing (n=5');
      expect(actualMessage).toContain('mean=');
      expect(actualMessage).toContain('median=');
      expect(actualMessage).toContain('stddev=');
      expect(actualMessage).toContain('MAD=');
      expect(actualMessage).toContain('Distribution:');
      expect(actualMessage).toContain('Shape:');
    });

    test("should show setup/teardown active hint when hooks are provided", () => {
      // GIVEN a function that achieves 5 ops/sec with a setup hook configured
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {
          duration: givenDuration,
          setup: () => undefined,
        });
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message includes setup/teardown active hint
      expect(actualMessage).toContain('setup/teardown active');
    });

    test("should NOT show setup/teardown hint when no hooks provided", () => {
      // GIVEN a function that achieves 5 ops/sec without any hooks
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message does NOT include setup/teardown active hint
      expect(actualMessage).not.toContain('setup/teardown active');
    });

    test("should show error rate line in diagnostics when errors occur within tolerance", () => {
      // GIVEN a function where 1 out of 5 operations fails within error tolerance
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);
      let callCount = 0;

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => {
          callCount++;
          if (callCount === 3) throw new Error("foo-error");
        }).toAchieveOpsPerSecond(10000, {duration: givenDuration, allowedErrorRate: 0.5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the error rate line appears in the diagnostic output
      expect(actualMessage).toContain('Error rate: 1/5 (20.0%) [within 50.0% tolerance]');
    });

    test("should show CI unavailable and warnings for n=1", () => {
      // GIVEN a function that completes only 1 operation within the time window
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN the throughput assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toAchieveOpsPerSecond(10000, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message indicates insufficient data for confidence intervals
      expect(actualMessage).toContain('N/A (insufficient data)');
      expect(actualMessage).toContain('Warnings:');
    });
  });

  describe("setup/teardown lifecycle", () => {
    test("should call suite setup once and pass state to callback", () => {
      // GIVEN a function that runs 3 operations with suite-level setup returning shared state
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const givenSetupData = ["foo-item-1", "foo-item-2"];
      const actualCallbackArgs: unknown[] = [];

      // WHEN the throughput assertion runs
      expect((data: unknown) => {
        actualCallbackArgs.push(data);
      }).toAchieveOpsPerSecond(1, {
        duration: givenDuration,
        setup: () => givenSetupData,
      });

      // THEN the callback receives the setup state on every invocation
      expect(actualCallbackArgs).toEqual([givenSetupData, givenSetupData, givenSetupData]);
    });

    test("should call suite teardown once after loop completes", () => {
      // GIVEN a function that runs 3 operations with suite-level setup and teardown
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const givenTeardownArgs: unknown[] = [];
      const givenSetupData = "foo-state";

      // WHEN the throughput assertion runs
      expect(() => undefined).toAchieveOpsPerSecond(1, {
        duration: givenDuration,
        setup: () => givenSetupData,
        teardown: (state) => {
          givenTeardownArgs.push(state);
        },
      });

      // THEN teardown is called exactly once with the setup state
      expect(givenTeardownArgs).toEqual([givenSetupData]);
    });

    test("should call teardown even when callback throws and allowedErrorRate is 0", () => {
      // GIVEN a function that always throws during measurement
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualTeardownCalled = false;

      // WHEN the callback throws during throughput measurement
      try {
        expect(() => {
          throw new Error("foo-error");
        }).toAchieveOpsPerSecond(1, {
          duration: givenDuration,
          teardown: () => {
            actualTeardownCalled = true;
          },
        });
      } catch {
        // expected
      }

      // THEN teardown is still called
      expect(actualTeardownCalled).toBe(true);
    });

    test("should call setupEach before each operation and teardownEach after", () => {
      // GIVEN a function that runs 3 operations with per-operation setup and teardown hooks
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const actualOrder: string[] = [];

      // WHEN the throughput assertion runs
      expect(() => {
        actualOrder.push('callback');
      }).toAchieveOpsPerSecond(1, {
        duration: givenDuration,
        setupEach: () => {
          actualOrder.push('setupEach');
        },
        teardownEach: () => {
          actualOrder.push('teardownEach');
        },
      });

      // THEN each operation is wrapped in setupEach → callback → teardownEach order
      const expectedOrder = [
        'setupEach', 'callback', 'teardownEach',
        'setupEach', 'callback', 'teardownEach',
        'setupEach', 'callback', 'teardownEach',
      ];
      expect(actualOrder).toEqual(expectedOrder);
    });

    test("should pass setupEach return value as second arg to callback and teardownEach", () => {
      // GIVEN a function that runs 2 operations with suite and per-operation setup providing state
      const givenOpDurations = [10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const givenSuiteState = "foo-suite";
      let callCount = 0;
      const actualCallbackArgs: unknown[][] = [];
      const actualTeardownArgs: unknown[][] = [];

      // WHEN the throughput assertion runs
      expect((...args: unknown[]) => {
        actualCallbackArgs.push([...args]);
      }).toAchieveOpsPerSecond(1, {
        duration: givenDuration,
        setup: () => givenSuiteState,
        setupEach: (suiteState) => `foo-iter-${++callCount}`,
        teardownEach: (suiteState, iterState) => {
          actualTeardownArgs.push([suiteState, iterState]);
        },
      });

      // THEN the callback and teardownEach receive both suite and iteration state
      expect(actualCallbackArgs).toEqual([
        [givenSuiteState, "foo-iter-1"],
        [givenSuiteState, "foo-iter-2"],
      ]);
      expect(actualTeardownArgs).toEqual([
        [givenSuiteState, "foo-iter-1"],
        [givenSuiteState, "foo-iter-2"],
      ]);
    });

    test("should call setupEach/teardownEach during warmup", () => {
      // GIVEN a function that runs 2 measured operations with 2 warmup iterations and per-operation hooks
      const givenOpDurations = [10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualSetupEachCount = 0;
      let actualTeardownEachCount = 0;

      // WHEN the throughput assertion runs
      expect(() => undefined).toAchieveOpsPerSecond(1, {
        duration: givenDuration,
        warmup: 2,
        setupEach: () => {
          actualSetupEachCount++;
        },
        teardownEach: () => {
          actualTeardownEachCount++;
        },
      });

      // THEN per-operation hooks are called during both warmup and measurement phases
      const expectedTotalCalls = 2 + 2; // 2 warmup + 2 measured
      expect(actualSetupEachCount).toBe(expectedTotalCalls);
      expect(actualTeardownEachCount).toBe(expectedTotalCalls);
    });
  });

  describe("error rate", () => {
    test("should propagate error immediately when allowedErrorRate is 0", () => {
      // GIVEN a function that always throws during measurement
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting throughput without error tolerance (default 0)
      // THEN the error propagates immediately
      expect(() => {
        expect(() => {
          throw new Error("foo-error");
        }).toAchieveOpsPerSecond(1, {duration: givenDuration});
      }).toThrow("foo-error");
    });

    test("should fail when error rate exceeds allowed tolerance", () => {
      // GIVEN a function where 3 out of 5 operations fail with only 10% error tolerance
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([0, 1, 2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);
      let callCount = 0;

      // WHEN the throughput assertion runs
      expect(() => {
        expect(() => {
          if (callCount < 3) { callCount++; throw new Error("foo-error"); }
          callCount++;
        }).toAchieveOpsPerSecond(1, {duration: givenDuration, allowedErrorRate: 0.1});
      }).toThrow('exceeds allowed');
    });

    test("should fail with all-failed message when all operations error", () => {
      // GIVEN a function where all 3 operations fail with error tolerance enabled
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([0, 1, 2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);

      // WHEN all operations fail during throughput measurement
      expect(() => {
        expect(() => {
          throw new Error("foo-error");
        }).toAchieveOpsPerSecond(1, {duration: givenDuration, allowedErrorRate: 1});
      }).toThrow('100% error rate');
    });

    test("should tolerate errors within allowed rate and report correct ops/sec", () => {
      // GIVEN a function where 1 out of 5 operations fails with 50% error tolerance
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);
      let callCount = 0;

      // WHEN 1 out of 5 operations fails within tolerance
      // THEN the assertion passes with the correct throughput from successful operations
      expect(() => {
        callCount++;
        if (callCount === 3) throw new Error("foo-error");
      }).toAchieveOpsPerSecond(4, {duration: givenDuration, allowedErrorRate: 0.5});
    });

    test("should pass when error rate equals allowed rate exactly", () => {
      // GIVEN a function where 1 out of 10 operations fails with exactly 10% error tolerance
      const givenOpDurations = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([4]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);
      let callCount = 0;

      // WHEN the error rate equals the allowed rate exactly
      // THEN the assertion passes because the check is strict greater-than
      expect(() => {
        callCount++;
        if (callCount === 5) throw new Error("foo-error");
      }).toAchieveOpsPerSecond(1, {duration: givenDuration, allowedErrorRate: 0.1});
    });
  });

  describe("outlier removal", () => {
    test("should keep outliers by default", () => {
      // GIVEN a function where 9 operations are fast and 1 is an extreme outlier
      const givenOpDurations = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting throughput without outlier removal (default)
      // THEN the assertion fails because the outlier inflates the mean per-op time
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(50, {duration: givenDuration});
      }).toThrow('ops/sec');
    });

    test("should remove outliers when enabled", () => {
      // GIVEN a function where 9 operations are fast and 1 is an extreme outlier
      const givenOpDurations = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN the assertion passes because throughput counts actual completed operations
      expect(() => undefined).toAchieveOpsPerSecond(10, {duration: givenDuration, outliers: 'remove'});
    });
  });

  describe("edge cases", () => {
    test("should handle n=1 when only one operation fits in duration", () => {
      // GIVEN a function that completes only 1 operation within the time window
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with a target of 1 ops/sec
      // THEN the assertion passes
      expect(() => undefined).toAchieveOpsPerSecond(1, {duration: givenDuration});
    });
  });

  describe("input validation", () => {
    test("should throw validation error when received value is not a function", () => {
      expect(() => {
        expect(42).toAchieveOpsPerSecond(100, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw validation error when expectedOpsPerSecond is negative", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(-1, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected ops/sec must be a positive number, received -1");
    });

    test("should throw validation error when expectedOpsPerSecond is zero", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(0, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected ops/sec must be a positive number, received 0");
    });

    test("should throw validation error when expectedOpsPerSecond is NaN", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(NaN, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected ops/sec must be a positive number, received NaN");
    });

    test("should throw validation error when expectedOpsPerSecond is Infinity", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(Infinity, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected ops/sec must be a positive number, received Infinity");
    });

    test("should throw validation error when duration is negative", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: -1});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received -1");
    });

    test("should throw validation error when duration is zero", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 0});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received 0");
    });

    test("should throw validation error when duration is NaN", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: NaN});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received NaN");
    });

    test("should throw validation error when duration is Infinity", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: Infinity});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received Infinity");
    });

    test("should throw validation error when options is null", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, null);
      }).toThrow("jest-performance-matchers: options must be an object with duration");
    });

    test("should throw validation error when warmup is negative", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, warmup: -1});
      }).toThrow("jest-performance-matchers: warmup must be a non-negative integer, received -1");
    });

    test("should throw validation error when warmup is non-integer", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, warmup: 1.5});
      }).toThrow("jest-performance-matchers: warmup must be a non-negative integer, received 1.5");
    });

    test("should throw validation error when outliers is invalid string", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid outliers for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, outliers: 'invalid'});
      }).toThrow("jest-performance-matchers: outliers must be 'remove' or 'keep', received 'invalid'");
    });

    test("should throw validation error when allowedErrorRate exceeds 1", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, allowedErrorRate: 1.5});
      }).toThrow("jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received 1.5");
    });

    test("should throw validation error when allowedErrorRate is negative", () => {
      expect(() => {
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, allowedErrorRate: -0.1});
      }).toThrow("jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received -0.1");
    });

    test("should throw validation error when setup is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid setup for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, setup: 42});
      }).toThrow("jest-performance-matchers: setup must be a function if provided, received number");
    });

    test("should throw validation error when teardown is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid teardown for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, teardown: 42});
      }).toThrow("jest-performance-matchers: teardown must be a function if provided, received number");
    });

    test("should throw validation error when setupEach is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid setupEach for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, setupEach: 42});
      }).toThrow("jest-performance-matchers: setupEach must be a function if provided, received number");
    });

    test("should throw validation error when teardownEach is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid teardownEach for testing
        expect(() => undefined).toAchieveOpsPerSecond(100, {duration: 1000, teardownEach: 42});
      }).toThrow("jest-performance-matchers: teardownEach must be a function if provided, received number");
    });
  });
});

describe("toResolveAtOpsPerSecond", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass the assertion when async function achieves target ops/sec", async () => {
      // GIVEN an async function that completes 5 operations within a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting it achieves at least 5 ops/sec
      // THEN the assertion passes
      await expect(async () => undefined).toResolveAtOpsPerSecond(5, {duration: givenDuration});
    });

    test("should pass the assertion when warmup is configured", async () => {
      // GIVEN an async function that completes 5 operations within a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with 2 warmup iterations
      // THEN the assertion passes
      await expect(async () => undefined).toResolveAtOpsPerSecond(5, {duration: givenDuration, warmup: 2});
    });
  });

  describe("fail", () => {
    test("should fail the assertion when async function does not achieve target ops/sec", async () => {
      // GIVEN an async function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenExpectedOps = 10;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting a target of 10 ops/sec
      // THEN the assertion fails
      let actualMessage = '';
      try {
        await expect(async () => undefined).toResolveAtOpsPerSecond(givenExpectedOps, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain(`expected function to achieve at least ${printExpected(givenExpectedOps)} ops/sec`);
    });
  });

  describe(".not", () => {
    test("should pass with .not when async function does not achieve target ops/sec", async () => {
      // GIVEN an async function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting .not with a target well above actual throughput
      // THEN the negated assertion passes
      await expect(async () => undefined).not.toResolveAtOpsPerSecond(10000, {duration: givenDuration});
    });

    test("should fail with .not when async function exceeds target ops/sec", async () => {
      // GIVEN an async function that achieves 5 ops/sec over a 1-second window
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenTarget = 1;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting .not with a target below actual throughput
      // THEN the negated assertion fails
      let actualMessage = '';
      try {
        await expect(async () => undefined).not.toResolveAtOpsPerSecond(givenTarget, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain(`expected function NOT to achieve at least ${printExpected(givenTarget)} ops/sec`);
    });
  });

  describe("async setup/teardown", () => {
    test("should call async setup once and pass state to callback", async () => {
      // GIVEN an async function that runs 3 operations with async suite-level setup
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      const givenSetupData = "foo-async-state";
      const actualCallbackArgs: unknown[] = [];

      // WHEN the throughput assertion runs
      await expect(async (data: unknown) => {
        actualCallbackArgs.push(data);
      }).toResolveAtOpsPerSecond(1, {
        duration: givenDuration,
        setup: async () => givenSetupData,
      });

      // THEN the callback receives the setup state on every invocation
      expect(actualCallbackArgs).toEqual([givenSetupData, givenSetupData, givenSetupData]);
    });

    test("should call async teardown even when callback rejects", async () => {
      // GIVEN an async function that always rejects during measurement
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualTeardownCalled = false;

      // WHEN the callback rejects during throughput measurement
      try {
        await expect(async () => {
          throw new Error("foo-async-error");
        }).toResolveAtOpsPerSecond(1, {
          duration: givenDuration,
          teardown: async () => {
            actualTeardownCalled = true;
          },
        });
      } catch {
        // expected
      }

      // THEN teardown is still called
      expect(actualTeardownCalled).toBe(true);
    });

    test("should call async setupEach per operation", async () => {
      // GIVEN an async function that runs 3 operations with async per-operation setup
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualSetupEachCount = 0;

      // WHEN the throughput assertion runs
      await expect(async () => undefined).toResolveAtOpsPerSecond(1, {
        duration: givenDuration,
        setupEach: async () => {
          actualSetupEachCount++;
        },
      });

      // THEN async setupEach is called once per operation
      expect(actualSetupEachCount).toBe(3);
    });

    test("should call async teardownEach per operation", async () => {
      // GIVEN an async function that runs 3 operations with async per-operation teardown
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualTeardownEachCount = 0;

      // WHEN the throughput assertion runs
      await expect(async () => undefined).toResolveAtOpsPerSecond(1, {
        duration: givenDuration,
        teardownEach: async () => {
          actualTeardownEachCount++;
        },
      });

      // THEN async teardownEach is called once per operation
      expect(actualTeardownEachCount).toBe(3);
    });
  });

  describe("error rate (async)", () => {
    test("should propagate rejection immediately when allowedErrorRate is 0", async () => {
      // GIVEN an async function that always rejects during measurement
      const givenOpDurations = [10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting throughput without error tolerance
      // THEN the rejection propagates immediately
      let actualError: Error | undefined;
      try {
        await expect(async () => {
          throw new Error("foo-async-error");
        }).toResolveAtOpsPerSecond(1, {duration: givenDuration});
      } catch (e) {
        actualError = e as Error;
      }
      expect(actualError?.message).toBe("foo-async-error");
    });

    test("should fail with all-failed message when all async operations error", async () => {
      // GIVEN an async function where all 3 operations fail with error tolerance enabled
      const givenOpDurations = [10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([0, 1, 2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);

      // WHEN all operations fail during throughput measurement
      let actualMessage = '';
      try {
        await expect(async () => {
          throw new Error("foo-error");
        }).toResolveAtOpsPerSecond(1, {duration: givenDuration, allowedErrorRate: 1});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the all-failed message is shown
      expect(actualMessage).toContain('100% error rate');
    });

    test("should fail when async error rate exceeds tolerance", async () => {
      // GIVEN an async function where 3 out of 5 operations fail with only 10% error tolerance
      const givenOpDurations = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const givenErrorIndices = new Set([0, 1, 2]);
      mockThroughputTimings(givenOpDurations, givenDuration, givenErrorIndices);
      let callCount = 0;

      // WHEN the error rate exceeds the allowed tolerance
      let actualMessage = '';
      try {
        await expect(async () => {
          if (callCount < 3) { callCount++; throw new Error("foo-error"); }
          callCount++;
        }).toResolveAtOpsPerSecond(1, {duration: givenDuration, allowedErrorRate: 0.1});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain('exceeds allowed');
    });
  });

  describe("async warmup", () => {
    test("should run async warmup with setupEach and teardownEach", async () => {
      // GIVEN an async function that runs 2 measured operations with 2 warmup iterations and async hooks
      const givenOpDurations = [10, 10];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);
      let actualSetupEachCount = 0;
      let actualTeardownEachCount = 0;

      // WHEN the throughput assertion runs with warmup
      await expect(async () => undefined).toResolveAtOpsPerSecond(1, {
        duration: givenDuration,
        warmup: 2,
        setupEach: async () => {
          actualSetupEachCount++;
        },
        teardownEach: async () => {
          actualTeardownEachCount++;
        },
      });

      // THEN async per-operation hooks are called during both warmup and measurement phases
      const expectedTotalCalls = 2 + 2; // 2 warmup + 2 measured
      expect(actualSetupEachCount).toBe(expectedTotalCalls);
      expect(actualTeardownEachCount).toBe(expectedTotalCalls);
    });
  });

  describe("outlier removal (async)", () => {
    test("should remove outliers when enabled for async matchers", async () => {
      // GIVEN an async function where 9 operations are fast and 1 is an extreme outlier
      const givenOpDurations = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDuration = 1000;
      mockThroughputTimings(givenOpDurations, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN the assertion passes because throughput counts actual completed operations
      await expect(async () => undefined).toResolveAtOpsPerSecond(10, {duration: givenDuration, outliers: 'remove'});
    });
  });

  describe("input validation (async)", () => {
    test("should throw validation error when received value is not a function", async () => {
      let actualMessage = '';
      try {
        await expect(42).toResolveAtOpsPerSecond(100, {duration: 1000});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw validation error when expectedOpsPerSecond is negative", async () => {
      let actualMessage = '';
      try {
        await expect(async () => undefined).toResolveAtOpsPerSecond(-1, {duration: 1000});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain("jest-performance-matchers: expected ops/sec must be a positive number, received -1");
    });

    test("should throw validation error when duration is zero", async () => {
      let actualMessage = '';
      try {
        await expect(async () => undefined).toResolveAtOpsPerSecond(100, {duration: 0});
      } catch (e) {
        actualMessage = (e as Error).message;
      }
      expect(actualMessage).toContain("jest-performance-matchers: duration must be a positive number, received 0");
    });
  });
});

describe("processThroughputResults", () => {
  test("should return pass=false when all operations failed", () => {
    // GIVEN all operations failed during measurement
    const actualResult = processThroughputResults({
      durations: [], totalOps: 5, errorCount: 5, allowedErrorRate: 1,
      expectedOpsPerSecond: 100, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an all-failed error message
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('100% error rate');
  });

  test("should return pass=false when error rate exceeds tolerance", () => {
    // GIVEN 3 out of 5 operations failed exceeding the 10% tolerance
    const actualResult = processThroughputResults({
      durations: [10, 10], totalOps: 5, errorCount: 3, allowedErrorRate: 0.1,
      expectedOpsPerSecond: 1, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an error rate exceeded message
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('exceeds allowed');
  });

  test("should return pass=true for a single successful operation", () => {
    // GIVEN a single operation completed successfully
    const actualResult = processThroughputResults({
      durations: [10], totalOps: 1, errorCount: 0, allowedErrorRate: 0,
      expectedOpsPerSecond: 1, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result passes
    expect(actualResult.pass).toBe(true);
  });
});
