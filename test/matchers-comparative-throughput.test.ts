import '../src/main';
import {processComparativeThroughputResults} from '../src/helpers';
import {mockComparativeThroughputTimings} from './test-utils';

describe("toHaveHigherThroughputThan", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass when Function A has higher throughput than Function B", () => {
      // GIVEN Function A completes 10 fast ops while B completes 5 slow ops in the same duration
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting A has higher throughput than B
      // THEN the assertion passes
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
    });

    test("should pass when warmup iterations are configured", () => {
      // GIVEN Function A is faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with 2 warmup iterations
      // THEN the assertion passes
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration, warmup: 2});
    });

    test("should pass when outlier removal is enabled", () => {
      // GIVEN Function A has an outlier op, Function B is consistently slow
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN the assertion passes after outliers are cleaned from per-op stats
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration, outliers: 'remove'});
    });

    test("should pass with custom confidence level", () => {
      // GIVEN Function A is faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with a relaxed confidence level
      // THEN the assertion passes
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration, confidence: 0.90});
    });

    test("should default confidence to 0.95 when not specified", () => {
      // GIVEN Function A is faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without specifying confidence
      // THEN the assertion passes with the default confidence of 0.95
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
    });

    test("should default warmup to 0 when not specified", () => {
      // GIVEN Function A is faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      const givenCallbackA = jest.fn();
      const givenCallbackB = jest.fn();

      // WHEN asserting without specifying warmup
      expect(givenCallbackA).toHaveHigherThroughputThan(givenCallbackB, {duration: givenDuration});

      // THEN each callback is called exactly once per measurement op (no warmup)
      expect(givenCallbackA).toHaveBeenCalledTimes(10);
      expect(givenCallbackB).toHaveBeenCalledTimes(5);
    });
  });

  describe("fail", () => {
    test("should fail when Function A has similar throughput to Function B", () => {
      // GIVEN both functions complete the same number of ops at the same speed
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting A has higher throughput than B
      // THEN the assertion fails (no statistically significant difference)
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('expected Function A to have higher throughput than Function B');
    });

    test("should fail when Function A has lower throughput than Function B", () => {
      // GIVEN Function A is slower than Function B
      const givenDurationsA = [20, 20, 20, 20, 20];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting A has higher throughput than B
      // THEN the assertion fails
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('no statistically significant difference');
    });

    test("should include diagnostic stats in failure message", () => {
      // GIVEN both functions have similar throughput
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the comparison assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes per-function throughput and comparison diagnostics
      expect(actualMessage).toContain('--- Function A ---');
      expect(actualMessage).toContain('--- Function B ---');
      expect(actualMessage).toContain('--- Comparison ---');
      expect(actualMessage).toContain('Throughput:');
      expect(actualMessage).toContain('Per-operation timing');
      expect(actualMessage).toContain("Welch's t-test");
      expect(actualMessage).toContain('Result:');
    });
  });

  describe(".not", () => {
    test("should pass with .not when A does NOT have higher throughput", () => {
      // GIVEN Function A is slower than Function B
      const givenDurationsA = [20, 20, 20, 20, 20];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting .not
      // THEN the negated assertion passes
      expect(() => undefined).not.toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
    });

    test("should fail with .not when A genuinely has higher throughput", () => {
      // GIVEN Function A is much faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting .not against a clear winner
      // THEN the negated assertion fails
      expect(() => {
        expect(() => undefined).not.toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('expected Function A NOT to have higher throughput than Function B');
    });
  });

  describe("diagnostics", () => {
    test("should show both functions' throughput in comparison section", () => {
      // GIVEN both functions have similar throughput
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message shows per-function throughput in ops/sec
      expect(actualMessage).toContain('Throughput: A=5 ops/sec, B=5 ops/sec');
    });

    test("should show setup/teardown active hint when hooks are provided", () => {
      // GIVEN both functions have similar throughput, with setup hook configured
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration, setup: () => undefined,
        });
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message includes setup/teardown active hint
      expect(actualMessage).toContain('setup/teardown active');
    });

    test("should NOT show setup/teardown hint when no hooks provided", () => {
      // GIVEN both functions have similar throughput without hooks
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the message does NOT include setup/teardown active hint
      expect(actualMessage).not.toContain('setup/teardown active');
    });

    test("should show higher-by line when A is faster in passing .not assertion", () => {
      // GIVEN Function A is much faster than Function B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the .not assertion fails (A is faster)
      let actualMessage = '';
      try {
        expect(() => undefined).not.toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the comparison line shows Function A is higher
      expect(actualMessage).toContain('Function A is higher by');
    });

    test("should show lower-by line when A is slower", () => {
      // GIVEN Function A is slower than Function B
      const givenDurationsA = [20, 20, 20, 20, 20];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the assertion fails
      let actualMessage = '';
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the comparison line shows Function A is lower
      expect(actualMessage).toContain('Function A is lower by');
    });
  });

  describe("setup/teardown lifecycle", () => {
    test("should call suite setup once and pass state to both callbacks", () => {
      // GIVEN both functions run with a shared suite setup
      const givenDurationsA = [10, 10];
      const givenDurationsB = [10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      const givenSuiteState = "foo-suite";
      const actualArgsA: unknown[] = [];
      const actualArgsB: unknown[] = [];

      // WHEN the comparison assertion runs
      try {
        expect((data: unknown) => { actualArgsA.push(data); }).toHaveHigherThroughputThan(
          (data: unknown) => { actualArgsB.push(data); },
          {duration: givenDuration, setup: () => givenSuiteState},
        );
      } catch { /* may fail, but we only care about the state passing */ }

      // THEN both callbacks receive the shared suite state
      expect(actualArgsA).toEqual([givenSuiteState, givenSuiteState]);
      expect(actualArgsB).toEqual([givenSuiteState, givenSuiteState]);
    });

    test("should call suite teardown once after both measurements", () => {
      // GIVEN both functions run with a suite teardown
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      const givenSuiteState = "foo-state";
      const actualTeardownArgs: unknown[] = [];

      // WHEN the comparison assertion runs
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration,
          setup: () => givenSuiteState,
          teardown: (state) => { actualTeardownArgs.push(state); },
        });
      } catch { /* may fail but teardown is independent */ }

      // THEN teardown is called exactly once with the suite state
      expect(actualTeardownArgs).toEqual([givenSuiteState]);
    });

    test("should call teardown even when callback throws and allowedErrorRate is 0", () => {
      // GIVEN Function A throws on first op
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      let actualTeardownCalled = false;

      // WHEN the callback throws during measurement
      try {
        expect(() => { throw new Error("foo-error"); }).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration,
          teardown: () => { actualTeardownCalled = true; },
        });
      } catch { /* expected */ }

      // THEN teardown is still called
      expect(actualTeardownCalled).toBe(true);
    });

    test("should call setupEach/teardownEach per operation for both functions", () => {
      // GIVEN both functions run with per-op hooks
      const givenDurationsA = [10, 10];
      const givenDurationsB = [10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      let actualSetupEachCount = 0;
      let actualTeardownEachCount = 0;

      // WHEN the comparison assertion runs
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration,
          setupEach: () => { actualSetupEachCount++; },
          teardownEach: () => { actualTeardownEachCount++; },
        });
      } catch { /* may fail */ }

      // THEN per-op hooks are called once per operation across both functions (2 + 3 = 5)
      expect(actualSetupEachCount).toBe(5);
      expect(actualTeardownEachCount).toBe(5);
    });

    test("should call setupEach/teardownEach during warmup for both functions", () => {
      // GIVEN both functions run with warmup and per-op hooks
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      let actualSetupEachCount = 0;
      let actualTeardownEachCount = 0;

      // WHEN the comparison assertion runs with 2 warmup iterations
      try {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration, warmup: 2,
          setupEach: () => { actualSetupEachCount++; },
          teardownEach: () => { actualTeardownEachCount++; },
        });
      } catch { /* may fail */ }

      // THEN per-op hooks fire during both warmup (2*2 = 4) and measurement (1+1 = 2)
      expect(actualSetupEachCount).toBe(6);
      expect(actualTeardownEachCount).toBe(6);
    });

    test("should propagate setupEach error immediately", () => {
      // GIVEN setupEach throws
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN setupEach throws during warmup/measurement
      // THEN the error propagates immediately
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
          duration: givenDuration,
          setupEach: () => { throw new Error("foo-setup-error"); },
        });
      }).toThrow("foo-setup-error");
    });

    test("should pass suite state and iter state to callbacks in correct order", () => {
      // GIVEN suite and per-op setup provide state
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      const givenSuiteState = "foo-suite";
      let iterCounter = 0;
      const actualArgsA: unknown[][] = [];
      const actualArgsB: unknown[][] = [];

      // WHEN the assertion runs
      try {
        expect((...args: unknown[]) => { actualArgsA.push([...args]); }).toHaveHigherThroughputThan(
          (...args: unknown[]) => { actualArgsB.push([...args]); },
          {
            duration: givenDuration,
            setup: () => givenSuiteState,
            setupEach: () => `foo-iter-${++iterCounter}`,
          },
        );
      } catch { /* may fail */ }

      // THEN both callbacks receive [suiteState, iterState]
      expect(actualArgsA).toEqual([[givenSuiteState, "foo-iter-1"]]);
      expect(actualArgsB).toEqual([[givenSuiteState, "foo-iter-2"]]);
    });
  });

  describe("error rate", () => {
    test("should propagate Function A error immediately when allowedErrorRate is 0", () => {
      // GIVEN Function A throws
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without error tolerance
      // THEN Function A's error propagates immediately
      expect(() => {
        expect(() => { throw new Error("foo-error-A"); }).toHaveHigherThroughputThan(
          () => undefined, {duration: givenDuration},
        );
      }).toThrow("foo-error-A");
    });

    test("should propagate Function B error immediately when allowedErrorRate is 0", () => {
      // GIVEN Function B throws (A succeeds)
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without error tolerance
      // THEN Function B's error propagates immediately
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(
          () => { throw new Error("foo-error-B"); }, {duration: givenDuration},
        );
      }).toThrow("foo-error-B");
    });

    test("should fail when Function A error rate exceeds allowed tolerance", () => {
      // GIVEN Function A has 3 errors out of 5, Function B has none
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const errorIndicesA = new Set([0, 1, 2]);
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration, errorIndicesA);
      let callCountA = 0;

      // WHEN the assertion runs with only 10% tolerance
      expect(() => {
        expect(() => {
          callCountA++;
          if (callCountA <= 3) throw new Error("foo-error-A");
        }).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration, allowedErrorRate: 0.1});
      }).toThrow('Function A: error rate');
    });

    test("should fail when Function B error rate exceeds allowed tolerance (integration)", () => {
      // GIVEN Function A is clean, Function B has 3 errors out of 5
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      const errorIndicesB = new Set([0, 1, 2]);
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration, undefined, errorIndicesB);
      let callCountB = 0;

      // WHEN the assertion runs with only 10% tolerance
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => {
          callCountB++;
          if (callCountB <= 3) throw new Error("foo-error-B");
        }, {duration: givenDuration, allowedErrorRate: 0.1});
      }).toThrow('Function B: error rate');
    });

    test("should tolerate errors within allowed rate for both functions", () => {
      // GIVEN Function A has 1 error out of 10, Function B has 1 error out of 5, both within tolerance
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      const errorIndicesA = new Set([5]);
      const errorIndicesB = new Set([2]);
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration, errorIndicesA, errorIndicesB);
      let callCountA = 0;
      let callCountB = 0;

      // WHEN asserting with allowedErrorRate=0.5
      // THEN the assertion passes with errors tolerated
      expect(() => {
        callCountA++;
        if (callCountA === 6) throw new Error("foo-error-A");
      }).toHaveHigherThroughputThan(() => {
        callCountB++;
        if (callCountB === 3) throw new Error("foo-error-B");
      }, {duration: givenDuration, allowedErrorRate: 0.5});
    });

    test("should show all-failed message when Function A has all errors", () => {
      // GIVEN Function A has all operations fail
      const givenDurationsA = [10, 10, 10];
      const givenDurationsB = [10, 10, 10];
      const givenDuration = 1000;
      const errorIndicesA = new Set([0, 1, 2]);
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration, errorIndicesA);

      // WHEN all of A's operations fail
      expect(() => {
        expect(() => { throw new Error("foo-error-A"); }).toHaveHigherThroughputThan(
          () => undefined, {duration: givenDuration, allowedErrorRate: 1},
        );
      }).toThrow('Function A: all 3 operations failed');
    });
  });

  describe("outlier removal", () => {
    test("should keep outliers by default", () => {
      // GIVEN Function A is fast but has an outlier op, Function B is consistently fast
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without outlier removal (default)
      // THEN the outlier in A inflates variance and the test reports no significant difference
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('no statistically significant difference');
    });

    test("should remove outliers when enabled", () => {
      // GIVEN Function A has one outlier op, Function B is consistently slower
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN outlier is removed from per-op stats and A's advantage becomes statistically significant
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration, outliers: 'remove'});
    });
  });

  describe("edge cases", () => {
    test("should fail with insufficient data message when Function A has n=1", () => {
      // GIVEN Function A only completes 1 op in the window
      const givenDurationsA = [10];
      const givenDurationsB = [10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting
      // THEN the result fails with insufficient data for Welch's t-test
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('Function A: insufficient data after processing (n=1)');
    });

    test("should fail with insufficient data message when Function B has n=1", () => {
      // GIVEN Function B only completes 1 op in the window
      const givenDurationsA = [10, 10, 10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting
      // THEN the result fails with insufficient data for Welch's t-test
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});
      }).toThrow('Function B: insufficient data after processing (n=1)');
    });
  });

  describe("input validation", () => {
    test("should throw when received value is not a function", () => {
      expect(() => {
        expect(42).toHaveHigherThroughputThan(() => undefined, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw when comparison function is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-function
        expect(() => undefined).toHaveHigherThroughputThan(42, {duration: 1000});
      }).toThrow("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw when options is null", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(
          () => undefined, null as unknown as {duration: number},
        );
      }).toThrow("jest-performance-matchers: options must be an object with duration");
    });

    test("should throw when duration is negative", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: -1});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received -1");
    });

    test("should throw when duration is zero", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 0});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received 0");
    });

    test("should throw when duration is NaN", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: NaN});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received NaN");
    });

    test("should throw when duration is Infinity", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: Infinity});
      }).toThrow("jest-performance-matchers: duration must be a positive number, received Infinity");
    });

    test("should throw when warmup is negative", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, warmup: -1});
      }).toThrow("jest-performance-matchers: warmup must be a non-negative integer, received -1");
    });

    test("should throw when warmup is non-integer", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, warmup: 1.5});
      }).toThrow("jest-performance-matchers: warmup must be a non-negative integer, received 1.5");
    });

    test("should throw when confidence is zero", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: 0});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received 0");
    });

    test("should throw when confidence is one", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: 1});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received 1");
    });

    test("should throw when confidence is negative", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: -0.1});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received -0.1");
    });

    test("should throw when confidence is greater than 1", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: 1.5});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received 1.5");
    });

    test("should throw when confidence is NaN", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: NaN});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received NaN");
    });

    test("should throw when confidence is not a number", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-number
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, confidence: 'high'});
      }).toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received high");
    });

    test("should throw when outliers is invalid string", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid outliers
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, outliers: 'invalid'});
      }).toThrow("jest-performance-matchers: outliers must be 'remove' or 'keep', received 'invalid'");
    });

    test("should throw when allowedErrorRate exceeds 1", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, allowedErrorRate: 1.5});
      }).toThrow("jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received 1.5");
    });

    test("should throw when allowedErrorRate is negative", () => {
      expect(() => {
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, allowedErrorRate: -0.1});
      }).toThrow("jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received -0.1");
    });

    test("should throw when logDiagnostics is invalid", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid logDiagnostics
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, logDiagnostics: 'BAD'});
      }).toThrow("jest-performance-matchers: logDiagnostics must be 'INFO', 'WARN', or 'FAIL', received 'BAD'");
    });

    test("should throw when setup is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-function setup
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, setup: 42});
      }).toThrow("jest-performance-matchers: setup must be a function if provided, received number");
    });

    test("should throw when teardown is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-function teardown
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, teardown: 42});
      }).toThrow("jest-performance-matchers: teardown must be a function if provided, received number");
    });

    test("should throw when setupEach is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-function setupEach
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, setupEach: 42});
      }).toThrow("jest-performance-matchers: setupEach must be a function if provided, received number");
    });

    test("should throw when teardownEach is not a function", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing non-function teardownEach
        expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: 1000, teardownEach: 42});
      }).toThrow("jest-performance-matchers: teardownEach must be a function if provided, received number");
    });
  });
});

describe("toResolveWithHigherThroughputThan", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass when async A has higher throughput than async B", async () => {
      // GIVEN async Function A completes more ops than B in the same window
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting A has higher throughput than B
      // THEN the assertion passes
      await expect(async () => undefined).toResolveWithHigherThroughputThan(
        async () => undefined, {duration: givenDuration},
      );
    });

    test("should pass with warmup configured", async () => {
      // GIVEN async Function A is faster
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with 2 warmup iterations
      // THEN the assertion passes
      await expect(async () => undefined).toResolveWithHigherThroughputThan(
        async () => undefined, {duration: givenDuration, warmup: 2},
      );
    });
  });

  describe("fail", () => {
    test("should fail when async functions have similar throughput", async () => {
      // GIVEN both async functions have similar speed
      const givenDurationsA = [10, 10, 10, 10, 10];
      const givenDurationsB = [10, 10, 10, 10, 10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN the comparison assertion fails
      let actualMessage = '';
      try {
        await expect(async () => undefined).toResolveWithHigherThroughputThan(
          async () => undefined, {duration: givenDuration},
        );
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message is framed in throughput terms
      expect(actualMessage).toContain('expected Function A to have higher throughput than Function B');
    });
  });

  describe(".not", () => {
    test("should pass with .not when async A is not faster", async () => {
      // GIVEN async Function A is slower than B
      const givenDurationsA = [20, 20, 20, 20, 20];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting .not
      // THEN the negated assertion passes
      await expect(async () => undefined).not.toResolveWithHigherThroughputThan(
        async () => undefined, {duration: givenDuration},
      );
    });

    test("should fail with .not when async A genuinely has higher throughput", async () => {
      // GIVEN async Function A is much faster than B
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting .not against a clear winner
      let actualMessage = '';
      try {
        await expect(async () => undefined).not.toResolveWithHigherThroughputThan(
          async () => undefined, {duration: givenDuration},
        );
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the .not assertion fails
      expect(actualMessage).toContain('expected Function A NOT to have higher throughput than Function B');
    });
  });

  describe("async setup/teardown", () => {
    test("should call async suite setup once and pass state to both callbacks", async () => {
      // GIVEN both async functions share suite state
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      const givenSuiteState = "foo-async-state";
      const actualArgsA: unknown[] = [];
      const actualArgsB: unknown[] = [];

      // WHEN the async assertion runs
      try {
        await expect(async (data: unknown) => { actualArgsA.push(data); }).toResolveWithHigherThroughputThan(
          async (data: unknown) => { actualArgsB.push(data); },
          {duration: givenDuration, setup: async () => givenSuiteState},
        );
      } catch { /* may fail */ }

      // THEN both callbacks receive the shared suite state
      expect(actualArgsA).toEqual([givenSuiteState]);
      expect(actualArgsB).toEqual([givenSuiteState]);
    });

    test("should call async teardown even when callback rejects", async () => {
      // GIVEN async Function A rejects
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      let actualTeardownCalled = false;

      // WHEN the async callback rejects during measurement
      try {
        await expect(async () => { throw new Error("foo-async-error"); }).toResolveWithHigherThroughputThan(
          async () => undefined, {
            duration: givenDuration,
            teardown: async () => { actualTeardownCalled = true; },
          },
        );
      } catch { /* expected */ }

      // THEN teardown is still called
      expect(actualTeardownCalled).toBe(true);
    });

    test("should call async setupEach/teardownEach for both functions including warmup", async () => {
      // GIVEN both async functions run with per-op hooks and warmup
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
      let actualSetupEachCount = 0;
      let actualTeardownEachCount = 0;

      // WHEN the assertion runs with 1 warmup iteration
      try {
        await expect(async () => undefined).toResolveWithHigherThroughputThan(
          async () => undefined, {
            duration: givenDuration, warmup: 1,
            setupEach: async () => { actualSetupEachCount++; },
            teardownEach: async () => { actualTeardownEachCount++; },
          },
        );
      } catch { /* may fail */ }

      // THEN per-op hooks fire during warmup (1*2) and measurement (1+1)
      expect(actualSetupEachCount).toBe(4);
      expect(actualTeardownEachCount).toBe(4);
    });
  });

  describe("async error rate", () => {
    test("should propagate async A rejection immediately when allowedErrorRate is 0", async () => {
      // GIVEN async Function A rejects
      const givenDurationsA = [10];
      const givenDurationsB = [10];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without error tolerance
      // THEN the async rejection propagates
      await expect(
        expect(async () => { throw new Error("foo-async-A"); }).toResolveWithHigherThroughputThan(
          async () => undefined, {duration: givenDuration},
        ),
      ).rejects.toThrow("foo-async-A");
    });

    test("should remove outliers when enabled (async)", async () => {
      // GIVEN async Function A has an outlier, Function B is consistently slower
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting with outlier removal enabled
      // THEN the outlier is removed and A's advantage becomes statistically significant
      await expect(async () => undefined).toResolveWithHigherThroughputThan(
        async () => undefined, {duration: givenDuration, outliers: 'remove'},
      );
    });

    test("should keep outliers by default (async)", async () => {
      // GIVEN async Function A has an outlier and B has consistent fast ops
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 500];
      const givenDurationsB = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDuration = 1000;
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);

      // WHEN asserting without outlier removal (default)
      // THEN the outlier inflates variance and no significant difference is detected
      await expect(async () => {
        await expect(async () => undefined).toResolveWithHigherThroughputThan(
          async () => undefined, {duration: givenDuration},
        );
      }).rejects.toThrow('no statistically significant difference');
    });

    test("should tolerate async errors within allowed rate", async () => {
      // GIVEN async A and B both have some errors within tolerance
      const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const givenDurationsB = [20, 20, 20, 20, 20];
      const givenDuration = 1000;
      const errorIndicesA = new Set([5]);
      mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration, errorIndicesA);
      let callCountA = 0;

      // WHEN asserting with allowedErrorRate=0.5
      // THEN the assertion passes
      await expect(async () => {
        callCountA++;
        if (callCountA === 6) throw new Error("foo-async-A");
      }).toResolveWithHigherThroughputThan(
        async () => undefined,
        {duration: givenDuration, allowedErrorRate: 0.5},
      );
    });
  });

  describe("async input validation", () => {
    test("should throw when received value is not a function", async () => {
      await expect(async () => {
        await expect(42).toResolveWithHigherThroughputThan(async () => undefined, {duration: 1000});
      }).rejects.toThrow("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw when comparison function is not a function", async () => {
      await expect(async () => {
        // @ts-expect-error - intentionally passing non-function
        await expect(async () => undefined).toResolveWithHigherThroughputThan(42, {duration: 1000});
      }).rejects.toThrow("jest-performance-matchers: expected value must be a function, received number");
    });

    test("should throw when duration is negative", async () => {
      await expect(async () => {
        await expect(async () => undefined).toResolveWithHigherThroughputThan(async () => undefined, {duration: -1});
      }).rejects.toThrow("jest-performance-matchers: duration must be a positive number, received -1");
    });

    test("should throw when confidence is invalid", async () => {
      await expect(async () => {
        await expect(async () => undefined).toResolveWithHigherThroughputThan(
          async () => undefined, {duration: 1000, confidence: 0},
        );
      }).rejects.toThrow("jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received 0");
    });
  });
});

describe("logDiagnostics option (toHaveHigherThroughputThan)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should log via console.info on passing test when logDiagnostics is 'INFO'", () => {
    // GIVEN Function A has clearly higher throughput
    const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const givenDurationsB = [20, 20, 20, 20, 20];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN asserting with logDiagnostics: 'INFO'
    expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
      duration: givenDuration, logDiagnostics: 'INFO',
    });

    // THEN console.info is called with the diagnostics block
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toContain('[jest-performance-matchers] Diagnostics:');
  });

  test("should log via console.warn on passing test with warnings (default WARN)", () => {
    // GIVEN Function A is much faster with tiny sample sizes (triggering POOR sample adequacy)
    const givenDurationsA = [1, 1];
    const givenDurationsB = [100, 100];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // WHEN asserting with default logDiagnostics (WARN)
    expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});

    // THEN console.warn is called because small sample triggers POOR sample adequacy
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[jest-performance-matchers] Diagnostics (warnings detected):');
  });

  test("should not log on passing test when logDiagnostics is 'FAIL'", () => {
    // GIVEN Function A is much faster (with warnings present)
    const givenDurationsA = [1, 1];
    const givenDurationsB = [100, 100];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN asserting with logDiagnostics: 'FAIL'
    expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
      duration: givenDuration, logDiagnostics: 'FAIL',
    });

    // THEN no console output
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  test("should not log on passing test when WARN and no warnings", () => {
    // GIVEN both functions have large, consistent samples with no warning conditions
    const givenDurationsA = Array(35).fill(1);
    const givenDurationsB = Array(35).fill(20);
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN asserting with default logDiagnostics (WARN)
    expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {duration: givenDuration});

    // THEN no console output (no warning conditions)
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  test("should not log on failing test regardless of logDiagnostics level", () => {
    // GIVEN both functions have identical throughput (assertion will fail)
    const givenDurationsA = [10, 10, 10, 10, 10];
    const givenDurationsB = [10, 10, 10, 10, 10];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN the assertion fails with logDiagnostics: 'INFO'
    expect(() => {
      expect(() => undefined).toHaveHigherThroughputThan(() => undefined, {
        duration: givenDuration, logDiagnostics: 'INFO',
      });
    }).toThrow();

    // THEN no console output (failures always show diagnostics in message instead)
    expect(infoSpy).not.toHaveBeenCalled();
  });
});

describe("logDiagnostics option (toResolveWithHigherThroughputThan)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should log via console.info on passing async test with 'INFO'", async () => {
    // GIVEN async Function A is much faster
    const givenDurationsA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const givenDurationsB = [20, 20, 20, 20, 20];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN asserting with logDiagnostics: 'INFO'
    await expect(async () => undefined).toResolveWithHigherThroughputThan(
      async () => undefined, {duration: givenDuration, logDiagnostics: 'INFO'},
    );

    // THEN console.info is called
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toContain('[jest-performance-matchers] Diagnostics:');
  });

  test("should not log on failing async test with 'INFO'", async () => {
    // GIVEN async functions with similar throughput (will fail)
    const givenDurationsA = [10, 10, 10, 10, 10];
    const givenDurationsB = [10, 10, 10, 10, 10];
    const givenDuration = 1000;
    mockComparativeThroughputTimings(givenDurationsA, givenDurationsB, givenDuration);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    // WHEN the async assertion fails
    await expect(
      expect(async () => undefined).toResolveWithHigherThroughputThan(
        async () => undefined, {duration: givenDuration, logDiagnostics: 'INFO'},
      ),
    ).rejects.toThrow();

    // THEN no console output
    expect(infoSpy).not.toHaveBeenCalled();
  });
});

describe("processComparativeThroughputResults", () => {
  test("should return pass=false when Function A has all operations failed", () => {
    // GIVEN Function A has 0 successes, all failed
    const actualResult = processComparativeThroughputResults({
      durationsA: [], durationsB: [10, 10, 10],
      totalOpsA: 5, totalOpsB: 3,
      errorCountA: 5, errorCountB: 0,
      allowedErrorRate: 1, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result fails with Function A all-failed message
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function A: all 5 operations failed');
  });

  test("should return pass=false when Function B has all operations failed", () => {
    // GIVEN Function B has 0 successes, all failed
    const actualResult = processComparativeThroughputResults({
      durationsA: [10, 10, 10], durationsB: [],
      totalOpsA: 3, totalOpsB: 5,
      errorCountA: 0, errorCountB: 5,
      allowedErrorRate: 1, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result fails with Function B all-failed message
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function B: all 5 operations failed');
  });

  test("should return pass=false when Function A error rate exceeds tolerance", () => {
    // GIVEN Function A has 3 errors out of 5 with 10% tolerance
    const actualResult = processComparativeThroughputResults({
      durationsA: [10, 10], durationsB: [10, 10, 10],
      totalOpsA: 5, totalOpsB: 3,
      errorCountA: 3, errorCountB: 0,
      allowedErrorRate: 0.1, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result fails
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function A: error rate 3/5');
  });

  test("should return pass=false when Function B error rate exceeds tolerance", () => {
    // GIVEN Function B has 3 errors out of 5 with 10% tolerance
    const actualResult = processComparativeThroughputResults({
      durationsA: [10, 10, 10], durationsB: [10, 10],
      totalOpsA: 3, totalOpsB: 5,
      errorCountA: 0, errorCountB: 3,
      allowedErrorRate: 0.1, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result fails
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function B: error rate 3/5');
  });

  test("should pass when A has clearly higher throughput than B", () => {
    // GIVEN A completes many fast ops while B completes few slow ops
    const actualResult = processComparativeThroughputResults({
      durationsA: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      durationsB: [20, 20, 20, 20, 20],
      totalOpsA: 10, totalOpsB: 5,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result passes with throughput comparison in message
    expect(actualResult.pass).toBe(true);
    expect(actualResult.message()).toContain('Throughput: A=10 ops/sec, B=5 ops/sec');
  });

  test("should show identical-throughput message when A=B exactly", () => {
    // GIVEN A and B have identical throughput and timings
    const actualResult = processComparativeThroughputResults({
      durationsA: [10, 10, 10, 10, 10],
      durationsB: [10, 10, 10, 10, 10],
      totalOpsA: 5, totalOpsB: 5,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result fails with identical throughput label
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('(identical throughput)');
  });

  test("should show A-trends-faster message when A is faster but not significantly", () => {
    // GIVEN A is modestly faster than B but sample size is too small for significance
    const actualResult = processComparativeThroughputResults({
      durationsA: [10, 11, 9],
      durationsB: [11, 10, 12],
      totalOpsA: 3, totalOpsB: 3,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the not-significant message mentions A trending faster
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function A trends higher by');
  });

  test("should show modest-difference note when significant with < 5% difference", () => {
    // GIVEN A has ~3% higher throughput than B with enough data for statistical significance
    const durationsA: number[] = [];
    for (let i = 0; i < 103; i++) durationsA.push(5 + (i % 2 === 0 ? 0.05 : -0.05));
    const durationsB: number[] = [];
    for (let i = 0; i < 100; i++) durationsB.push(5.15 + (i % 2 === 0 ? 0.05 : -0.05));

    const actualResult = processComparativeThroughputResults({
      durationsA, durationsB,
      totalOpsA: durationsA.length, totalOpsB: durationsB.length,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result passes with modest-difference practical note
    expect(actualResult.pass).toBe(true);
    expect(actualResult.message()).toContain('modest (< 5%)');
  });

  test("should format p-value numerically when p >= 0.0001 in pass message", () => {
    // GIVEN A is marginally but significantly faster with enough spread to yield p in [0.0001, 0.05)
    // Per-op means diff by 1ms with stddev ~0.88, n=10 each → one-sided p ≈ 0.01
    const actualResult = processComparativeThroughputResults({
      durationsA: [9, 10, 11, 9, 10, 11, 9, 10, 11, 9],
      durationsB: [10, 11, 12, 10, 11, 12, 10, 11, 12, 10],
      totalOpsA: 10, totalOpsB: 10,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN pass message includes numerically formatted p-value (not "<0.0001")
    expect(actualResult.pass).toBe(true);
    expect(actualResult.message()).toMatch(/but A has statistically significantly higher throughput \(p=0\.\d{4}/);
    expect(actualResult.message()).not.toMatch(/but A has statistically significantly higher throughput \(p=<0\.0001/);
  });

  test("should show practically-negligible note when significant with < 1% difference", () => {
    // GIVEN A has ~0.5% higher throughput than B (201 vs 200 ops) with tight per-op stats for significance
    const durationsA: number[] = [];
    for (let i = 0; i < 201; i++) durationsA.push(5 + (i % 2 === 0 ? 0.01 : -0.01));
    const durationsB: number[] = [];
    for (let i = 0; i < 200; i++) durationsB.push(5.05 + (i % 2 === 0 ? 0.01 : -0.01));

    const actualResult = processComparativeThroughputResults({
      durationsA, durationsB,
      totalOpsA: durationsA.length, totalOpsB: durationsB.length,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the result passes with the "practically negligible" note
    expect(actualResult.pass).toBe(true);
    expect(actualResult.message()).toContain('less than 1%');
    expect(actualResult.message()).toContain('practically negligible');
  });

  test("should report unreliable comparison when either function has POOR RME", () => {
    // GIVEN Function A has extremely high per-op variance (POOR RME)
    const actualResult = processComparativeThroughputResults({
      durationsA: [1, 100, 1, 100, 1, 100, 1, 100, 1, 100],
      durationsB: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      totalOpsA: 10, totalOpsB: 10,
      errorCountA: 0, errorCountB: 0,
      allowedErrorRate: 0, confidence: 0.95, duration: 1000,
      setupTeardownActive: false, removeOutliersEnabled: false, logDiagnostics: 'FAIL',
    });

    // THEN the diagnostics Result line reports an unreliable comparison
    expect(actualResult.message()).toContain('comparison is unreliable');
    expect(actualResult.message()).toContain('POOR RME');
  });
});
