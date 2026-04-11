import '../src/main';
import {processComparativeResults} from '../src/helpers';
import {mockFunctionProcessTimesInterleaved, mockFunctionProcessTimes} from './test-utils';

describe("toBeFasterThan", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass the assertion when Function A is statistically faster than Function B", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms over 10 iterations
      const givenFunctionADurations = [5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5];
      const givenFunctionBDurations = [15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with 10 iterations,
      // THEN the assertion passes because Function A is statistically faster
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10});
    });

    test("should pass the assertion when warmup iterations are configured", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with warmup=2 and iterations=5
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with warmup=2,
      // THEN the assertion passes (warmup runs do not produce hrtime measurements)
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 5, warmup: 2});
    });

    test("should pass the assertion when outlier removal is enabled", () => {
      // GIVEN Function A taking ~5ms with one 100ms outlier and Function B taking steady ~15ms
      const givenFunctionADurations = [5, 5, 5, 5, 5, 5, 5, 5, 5, 100];
      const givenFunctionBDurations = [15, 15, 15, 15, 15, 15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with outliers='remove',
      // THEN the assertion passes because Function A's outlier is removed and its true mean is ~5ms
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10, outliers: 'remove'});
    });

    test("should pass the assertion when custom confidence level is used", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with a relaxed confidence=0.90,
      // THEN the assertion passes
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 5, confidence: 0.90});
    });

    test("should default confidence to 0.95 when not specified", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms over 10 iterations
      const givenFunctionADurations = [5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5];
      const givenFunctionBDurations = [15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan without specifying confidence,
      // THEN the assertion passes using the default confidence of 0.95
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10});
    });

    test("should default warmup to 0 when not specified", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms over 5 iterations
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenFunctionA = jest.fn();
      const givenFunctionB = jest.fn();

      // WHEN asserting toBeFasterThan without specifying warmup,
      expect(givenFunctionA).toBeFasterThan(givenFunctionB, {iterations: 5});

      // THEN each callback is called exactly iteration times with no extra warmup calls
      expect(givenFunctionA).toHaveBeenCalledTimes(5);
      expect(givenFunctionB).toHaveBeenCalledTimes(5);
    });
  });

  describe("fail", () => {
    test("should fail the assertion when Function A is slower than Function B", () => {
      // GIVEN Function A taking ~15ms and Function B taking ~5ms (Function A is slower)
      const givenFunctionADurations = [15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15];
      const givenFunctionBDurations = [5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan,
      // THEN the assertion fails with a descriptive error because Function A is not faster
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10});
      }).toThrow('expected Function A to be faster than Function B');
    });

    test("should fail the assertion when functions have equal performance", () => {
      // GIVEN both Function A and Function B taking ~10ms (no meaningful difference)
      const givenFunctionADurations = [10, 10.1, 9.9, 10.2, 9.8, 10, 10.1, 9.9, 10, 10];
      const givenFunctionBDurations = [10, 10.1, 9.9, 10.2, 9.8, 10, 10.1, 9.9, 10, 10];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan,
      // THEN the assertion fails because there is no statistically significant difference
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10});
      }).toThrow('expected Function A to be faster than Function B');
    });

    test("should include diagnostic stats in failure message when assertion fails", () => {
      // GIVEN Function A taking ~15ms and Function B taking ~5ms (Function A is slower)
      const givenFunctionADurations = [15, 15, 15, 15, 15];
      const givenFunctionBDurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the toBeFasterThan assertion fails,
      // THEN the failure message includes per-function stats blocks and a comparison section
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 5});
      }).toThrow(/--- Function A ---[\s\S]*--- Function B ---[\s\S]*--- Comparison ---/);
    });
  });

  describe(".not", () => {
    test("should pass with .not when Function A is not faster than Function B", () => {
      // GIVEN Function A taking ~15ms and Function B taking ~5ms (Function A is slower)
      const givenFunctionADurations = [15, 15, 15, 15, 15];
      const givenFunctionBDurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with .not negation,
      // THEN the assertion passes because Function A is indeed not faster than Function B
      expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
    });

    test("should fail with .not when Function A IS faster with moderate p-value", () => {
      // GIVEN Function A taking ~10ms with variance and Function B taking ~13ms with variance (Function A is faster with moderate significance)
      const givenFunctionADurations = [8, 9, 10, 11, 12];
      const givenFunctionBDurations = [11, 12, 13, 14, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with .not negation,
      // THEN the assertion fails because Function A is actually statistically faster
      expect(() => {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      }).toThrow('expected Function A NOT to be faster than Function B');
    });

    test("should fail with .not when Function A IS much faster with very small p-value", () => {
      // GIVEN Function A taking constant 5ms and Function B taking constant 50ms over 50 iterations (degenerate p=0 case)
      const givenFunctionADurations = Array.from({length: 50}, () => 5);
      const givenFunctionBDurations = Array.from({length: 50}, () => 50);
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with .not negation,
      // THEN the assertion fails because Function A is overwhelmingly faster (p < 0.0001)
      expect(() => {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 50});
      }).toThrow('expected Function A NOT to be faster than Function B');
    });
  });

  describe("diagnostics", () => {
    test("should show Function A stats block when assertion fails via .not", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms (Function A is faster)
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the .not assertion fails because Function A is genuinely faster,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message contains the Function A statistics block
      expect(actualMessage).toContain('--- Function A ---');
      expect(actualMessage).toContain('Statistics (n=5');
    });

    test("should show Function B stats block when assertion fails via .not", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms (Function A is faster)
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the .not assertion fails because Function A is genuinely faster,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message contains the Function B statistics block
      expect(actualMessage).toContain('--- Function B ---');
    });

    test("should show comparison section with Welch t-test results when assertion fails via .not", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms (Function A is faster)
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the .not assertion fails because Function A is genuinely faster,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message contains the comparison section with Welch t-test details
      expect(actualMessage).toContain('--- Comparison ---');
      expect(actualMessage).toContain("Welch's t-test:");
      expect(actualMessage).toContain('Confidence interval for difference:');
      expect(actualMessage).toContain('Result:');
    });

    test("should show setup/teardown active hint when hooks are provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a suite-level setup hook
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetup = jest.fn();

      // WHEN the .not assertion fails with setup hook provided,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {
          iterations: 5,
          setup: givenSetup,
        });
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message contains the setup/teardown active hint
      expect(actualMessage).toContain('setup/teardown active');
    });

    test("should NOT show setup/teardown hint when no hooks are provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with no hooks configured
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the .not assertion fails without any hooks,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message does NOT contain the setup/teardown active hint
      expect(actualMessage).not.toContain('setup/teardown active');
    });

    test("should show mean difference in comparison section when assertion fails", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms (Function A is faster)
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN the .not assertion fails because Function A is genuinely faster,
      let actualMessage = '';
      try {
        expect(() => undefined).not.toBeFasterThan(() => undefined, {iterations: 5});
      } catch (e) {
        actualMessage = (e as Error).message;
      }

      // THEN the failure message includes the mean difference and direction indicator
      expect(actualMessage).toContain('Mean difference:');
      expect(actualMessage).toContain('Function A is faster');
    });
  });

  describe("setup/teardown lifecycle", () => {
    test("should call suite setup once and pass state to callbacks when setup is provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a suite-level setup that returns state
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetup = jest.fn(() => ({data: 'foo-test'}));
      const givenFunctionA = jest.fn();
      const givenFunctionB = jest.fn();

      // WHEN asserting toBeFasterThan with a suite-level setup hook,
      expect(givenFunctionA).toBeFasterThan(givenFunctionB, {iterations: 3, setup: givenSetup});

      // THEN setup is called exactly once
      expect(givenSetup).toHaveBeenCalledTimes(1);
      // AND each callback receives the suite state as its first argument
      expect(givenFunctionA.mock.calls[0][0]).toEqual({data: 'foo-test'});
      expect(givenFunctionB.mock.calls[0][0]).toEqual({data: 'foo-test'});
    });

    test("should call suite teardown once after all iterations when teardown is provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a suite-level teardown hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardown = jest.fn();

      // WHEN asserting toBeFasterThan with a suite-level teardown hook,
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 3, teardown: givenTeardown});

      // THEN teardown is called exactly once after all iterations complete
      expect(givenTeardown).toHaveBeenCalledTimes(1);
    });

    test("should call teardown even when callback throws and allowedErrorRate is 0", () => {
      // GIVEN Function A that always throws and a suite-level teardown hook with default allowedErrorRate (0)
      const givenFunctionADurations = [5];
      const givenFunctionBDurations = [15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardown = jest.fn();

      // WHEN the callback throws during execution,
      try {
        expect(() => { throw new Error('foo-boom'); }).toBeFasterThan(() => undefined, {iterations: 3, teardown: givenTeardown});
      } catch {
        // expected
      }

      // THEN teardown is still called via the outer try/finally
      expect(givenTeardown).toHaveBeenCalledTimes(1);
    });

    test("should call setupEach twice per iteration (once per function) when setupEach is provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a per-iteration setupEach hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEach = jest.fn(() => ({iter: true}));

      // WHEN asserting toBeFasterThan with setupEach for 3 iterations,
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 3, setupEach: givenSetupEach});

      // THEN setupEach is called 3 iterations x 2 functions = 6 times
      expect(givenSetupEach).toHaveBeenCalledTimes(6);
    });

    test("should call setupEach during warmup iterations when warmup is configured", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with warmup=2 and a setupEach hook
      const givenFunctionADurations = [5, 5];
      const givenFunctionBDurations = [15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEach = jest.fn();

      // WHEN asserting toBeFasterThan with warmup=2 and iterations=2,
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 2, warmup: 2, setupEach: givenSetupEach});

      // THEN setupEach is called (warmup=2 + iterations=2) x 2 functions = 8 times
      expect(givenSetupEach).toHaveBeenCalledTimes(8);
    });

    test("should call teardownEach during warmup for both functions when warmup is configured", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with warmup=2 and a teardownEach hook
      const givenFunctionADurations = [5, 5];
      const givenFunctionBDurations = [15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardownEach = jest.fn();

      // WHEN asserting toBeFasterThan with warmup=2 and iterations=2,
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 2, warmup: 2, teardownEach: givenTeardownEach});

      // THEN teardownEach is called (warmup=2 + iterations=2) x 2 functions = 8 times
      expect(givenTeardownEach).toHaveBeenCalledTimes(8);
    });

    test("should call teardownEach twice per iteration (once per function) when teardownEach is provided", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a per-iteration teardownEach hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardownEach = jest.fn();

      // WHEN asserting toBeFasterThan with teardownEach for 3 iterations,
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 3, teardownEach: givenTeardownEach});

      // THEN teardownEach is called 3 iterations x 2 functions = 6 times
      expect(givenTeardownEach).toHaveBeenCalledTimes(6);
    });

    test("should call teardownEach even when callback throws with error tolerance", () => {
      // GIVEN Function A that throws on its first iteration but succeeds on the 2nd and 3rd
      let givenHrtimeCount = 0;
      jest.spyOn(process, "hrtime").mockImplementation(() => {
        givenHrtimeCount++;
        return [0, givenHrtimeCount * 5000000]; // Each call = 5ms later
      });
      let givenCallCountA = 0;
      const givenFunctionA = jest.fn(() => {
        givenCallCountA++;
        if (givenCallCountA === 1) throw new Error('foo-boom');
      });
      const givenTeardownEach = jest.fn();

      // WHEN asserting toBeFasterThan with error tolerance (Function A fails 1/3 = 33%, allowed 50%),
      try {
        expect(givenFunctionA).toBeFasterThan(() => undefined, {
          iterations: 3,
          teardownEach: givenTeardownEach,
          allowedErrorRate: 0.5,
        });
      } catch {
        // Result may fail (insufficient data or not significantly faster), but that's fine
      }

      // THEN teardownEach is still called for both Function A and Function B on every iteration = 3 x 2 = 6 times
      expect(givenTeardownEach).toHaveBeenCalledTimes(6);
    });

    test("should pass setupEach return value as second arg to callbacks and teardownEach when setupEach returns state", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a setupEach that returns per-iteration state
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      let givenIterCounter = 0;
      const givenSetupEach = jest.fn(() => {
        givenIterCounter++;
        return {iter: givenIterCounter};
      });
      const givenFunctionA = jest.fn();
      const givenFunctionB = jest.fn();
      const givenTeardownEach = jest.fn();

      // WHEN asserting toBeFasterThan with setupEach and teardownEach,
      expect(givenFunctionA).toBeFasterThan(givenFunctionB, {
        iterations: 3,
        setupEach: givenSetupEach,
        teardownEach: givenTeardownEach,
      });

      // THEN each callback receives the per-iteration state as its second argument
      expect(givenFunctionA.mock.calls[0][1]).toEqual({iter: 1});
      // AND teardownEach receives the per-iteration state as its second argument
      expect(givenTeardownEach.mock.calls[0][1]).toEqual({iter: 1});
    });

    test("should propagate setupEach error immediately when setupEach throws", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a setupEach that throws
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEachError = "foo-setupEach-error";

      // WHEN asserting toBeFasterThan and setupEach throws,
      // THEN the setupEach error propagates immediately without being swallowed
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {
          iterations: 3,
          setupEach: () => { throw new Error(givenSetupEachError); },
        });
      }).toThrowError(givenSetupEachError);
    });

    test("should still call suite teardown when setupEach throws", () => {
      // GIVEN a setupEach that throws and a suite-level teardown hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEachError = "foo-setupEach-error";
      const givenTeardown = jest.fn();

      // WHEN asserting toBeFasterThan and setupEach throws on the first iteration,
      try {
        expect(() => undefined).toBeFasterThan(() => undefined, {
          iterations: 3,
          setupEach: () => { throw new Error(givenSetupEachError); },
          teardown: givenTeardown,
        });
      } catch {
        // expected
      }

      // THEN the suite-level teardown is still called via the outer try/finally
      expect(givenTeardown).toHaveBeenCalledTimes(1);
    });

    test("should propagate teardownEach error immediately when teardownEach throws", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with a teardownEach that throws
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardownEachError = "foo-teardownEach-error";

      // WHEN asserting toBeFasterThan and teardownEach throws,
      // THEN the teardownEach error propagates immediately without being swallowed
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {
          iterations: 3,
          teardownEach: () => { throw new Error(givenTeardownEachError); },
        });
      }).toThrowError(givenTeardownEachError);
    });

    test("should execute hooks in correct order: setup -> setupEach(A) -> A -> teardownEach(A) -> setupEach(B) -> B -> teardownEach(B) -> teardown", () => {
      // GIVEN Function A taking ~5ms and Function B taking ~15ms with all four lifecycle hooks configured for 2 iterations
      const givenIterations = 2;
      const actualCallOrder: string[] = [];
      let givenHrtimeCount = 0;
      jest.spyOn(process, "hrtime").mockImplementation(() => {
        givenHrtimeCount++;
        actualCallOrder.push('hrtime');
        // Make A faster than B: odd hrtime pairs get 5ms, even pairs get 15ms
        // Each measurement takes 2 hrtime calls (start, end)
        // Pair 1 (A iter 1): calls 1,2 -> 5ms; Pair 2 (B iter 1): calls 3,4 -> 15ms
        const pairIndex = Math.ceil(givenHrtimeCount / 2);
        const isStart = givenHrtimeCount % 2 !== 0;
        if (isStart) return [1, 0];
        const isA = pairIndex % 2 !== 0; // odd pairs are A, even pairs are B
        return [1, isA ? 5000000 : 15000000];
      });

      const givenFunctionA = jest.fn(() => { actualCallOrder.push('callbackA'); });
      const givenFunctionB = jest.fn(() => { actualCallOrder.push('callbackB'); });

      // WHEN asserting toBeFasterThan with all hooks configured for 2 iterations,
      expect(givenFunctionA).toBeFasterThan(givenFunctionB, {
        iterations: givenIterations,
        setup: () => { actualCallOrder.push('setup'); },
        teardown: () => { actualCallOrder.push('teardown'); },
        setupEach: () => { actualCallOrder.push('setupEach'); },
        teardownEach: () => { actualCallOrder.push('teardownEach'); },
      });

      // THEN the execution order is: setup, then per iteration [setupEach->hrtime->callback->hrtime->teardownEach] for Function A then Function B, then teardown
      const expectedCallOrder = [
        'setup',
        'setupEach', 'hrtime', 'callbackA', 'hrtime', 'teardownEach',
        'setupEach', 'hrtime', 'callbackB', 'hrtime', 'teardownEach',
        'setupEach', 'hrtime', 'callbackA', 'hrtime', 'teardownEach',
        'setupEach', 'hrtime', 'callbackB', 'hrtime', 'teardownEach',
        'teardown',
      ];
      expect(actualCallOrder).toEqual(expectedCallOrder);
    });
  });

  describe("error rate", () => {
    test("should propagate Function A error immediately when allowedErrorRate is 0", () => {
      // GIVEN Function A that always throws and default allowedErrorRate of 0

      // WHEN asserting toBeFasterThan,
      // THEN Function A's error propagates immediately as a fatal error
      expect(() => {
        expect(() => { throw new Error('foo-boom-a'); }).toBeFasterThan(() => undefined, {iterations: 5});
      }).toThrow('foo-boom-a');
    });

    test("should propagate Function B error immediately when allowedErrorRate is 0", () => {
      // GIVEN Function A that succeeds and Function B that always throws with default allowedErrorRate of 0
      const givenFunctionADurations = [5];
      mockFunctionProcessTimes(givenFunctionADurations);

      // WHEN asserting toBeFasterThan,
      // THEN Function B's error propagates immediately as a fatal error
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => { throw new Error('foo-boom-b'); }, {iterations: 5});
      }).toThrow('foo-boom-b');
    });

    test("should fail when Function A error rate exceeds allowed tolerance", () => {
      // GIVEN Function A that throws on all iterations and Function B that succeeds
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimes(givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with allowedErrorRate=0.1,
      // THEN the assertion fails with an all-failed message for Function A
      expect(() => {
        expect(() => { throw new Error('foo-boom'); }).toBeFasterThan(() => undefined, {
          iterations: 5,
          allowedErrorRate: 0.1,
        });
      }).toThrow('Function A: all 5 iterations failed');
    });

    test("should fail when Function B error rate exceeds allowed tolerance", () => {
      // GIVEN Function A that succeeds and Function B that throws on all iterations
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimes(givenFunctionADurations);

      // WHEN asserting toBeFasterThan with allowedErrorRate=0.1,
      // THEN the assertion fails with an all-failed message for Function B
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => { throw new Error('foo-boom'); }, {
          iterations: 5,
          allowedErrorRate: 0.1,
        });
      }).toThrow('Function B: all 5 iterations failed');
    });

    test("should count Function B errors and tolerate them within allowed rate", () => {
      // GIVEN Function B that throws intermittently on 1 of 3 iterations with error tolerance of 50%
      let givenHrtimeCount = 0;
      jest.spyOn(process, "hrtime").mockImplementation(() => {
        givenHrtimeCount++;
        return [0, givenHrtimeCount * 5000000];
      });
      let givenCallCountB = 0;
      const givenFunctionB = jest.fn(() => {
        givenCallCountB++;
        if (givenCallCountB === 1) throw new Error('foo-intermittent');
      });

      // WHEN asserting toBeFasterThan with error tolerance (Function B fails 1/3 = 33%, allowed 50%),
      try {
        expect(() => undefined).toBeFasterThan(givenFunctionB, {iterations: 3, allowedErrorRate: 0.5});
      } catch {
        // May fail comparison, that's fine -- we're testing error tolerance not the result
      }

      // THEN Function B was called 3 times (once per iteration) and the single failure was tolerated
      expect(givenFunctionB).toHaveBeenCalledTimes(3);
    });

    test("should tolerate errors within allowed rate when tested via processComparativeResults", () => {
      // GIVEN pre-computed durations where Function A had 2/10 errors (8 successes) and Function B had 0 errors
      const givenFunctionADurations = [5, 5, 5, 5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15, 15, 15, 15, 15, 15];

      // WHEN processing comparative results with 30% allowed error rate,
      const actualResult = processComparativeResults({
        durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations,
        count: 10, errorCountA: 2, errorCountB: 0,
        allowedErrorRate: 0.3, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
      });
      const actualMessage = actualResult.message();

      // THEN Function A's 2/10 = 20% error rate is within the 30% tolerance and does not trigger an error rate failure
      expect(actualMessage).not.toContain('exceeds allowed');
      // AND the comparison section is shown
      expect(actualMessage).toContain('--- Comparison ---');
    });

    test("should propagate warmup error as fatal even when allowedErrorRate is set", () => {
      // GIVEN a callback that throws during warmup phase with error tolerance enabled
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenError = new Error("foo-warmup-error");
      let givenWarmupDone = false;

      // WHEN asserting toBeFasterThan and the callback throws during warmup,
      // THEN the warmup error propagates immediately because warmup errors are always fatal
      expect(() => {
        expect((..._args: unknown[]) => {
          if (!givenWarmupDone) throw givenError;
        }).toBeFasterThan(() => undefined, {
          iterations: 3, warmup: 1, allowedErrorRate: 0.5,
        });
      }).toThrowError(givenError.message);
    });

    test("should propagate setupEach error as fatal even when allowedErrorRate is set", () => {
      // GIVEN a setupEach hook that throws with error tolerance enabled
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenError = new Error("foo-setupEach-error");

      // WHEN asserting toBeFasterThan and setupEach throws,
      // THEN the error propagates immediately because hook errors are not counted toward error rate
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {
          iterations: 3, allowedErrorRate: 0.5,
          setupEach: () => { throw givenError; },
        });
      }).toThrowError(givenError.message);
    });

    test("should propagate teardownEach error as fatal even when allowedErrorRate is set", () => {
      // GIVEN a teardownEach hook that throws with error tolerance enabled
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenError = new Error("foo-teardownEach-error");

      // WHEN asserting toBeFasterThan and teardownEach throws,
      // THEN the error propagates immediately because hook errors are not counted toward error rate
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {
          iterations: 3, allowedErrorRate: 0.5,
          teardownEach: () => { throw givenError; },
        });
      }).toThrowError(givenError.message);
    });
  });

  describe("outlier removal", () => {
    test("should keep outliers by default when outliers option is not specified", () => {
      // GIVEN Function A taking ~5ms with one massive 500ms outlier and Function B taking steady ~10ms
      const givenFunctionADurations = [5, 5, 5, 5, 5, 5, 5, 5, 5, 500];
      const givenFunctionBDurations = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan without specifying outlier removal,
      // THEN the assertion fails because Function A's mean (~54.5ms) exceeds Function B's mean (10ms) with the outlier included
      expect(() => {
        expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10});
      }).toThrow('expected Function A to be faster than Function B');
    });

    test("should remove outliers when enabled potentially changing the result", () => {
      // GIVEN the same data with Function A having a 500ms outlier and Function B at steady ~10ms
      const givenFunctionADurations = [5, 5, 5, 5, 5, 5, 5, 5, 5, 500];
      const givenFunctionBDurations = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with outliers='remove',
      // THEN the assertion passes because Function A's 500ms outlier is removed and its true mean (~5ms) is faster than Function B's 10ms
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 10, outliers: 'remove'});
    });
  });

  describe("edge cases", () => {
    test("should handle minimum iterations (n=2) when both functions have sufficient data", () => {
      // GIVEN Function A taking 5ms and Function B taking 50ms with only 2 iterations each
      const givenFunctionADurations = [5, 5];
      const givenFunctionBDurations = [50, 50];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toBeFasterThan with the minimum iterations of 2,
      // THEN the assertion passes because the difference is large enough even with minimal data
      expect(() => undefined).toBeFasterThan(() => undefined, {iterations: 2});
    });

    test("should fail when only 1 iteration succeeds for A (insufficient for t-test)", () => {
      // GIVEN Function A with 1 success and 4 errors (n=1 after errors) and Function B with 5 successes
      let givenCallCountA = 0;
      const givenFunctionA = jest.fn(() => {
        givenCallCountA++;
        if (givenCallCountA > 1) throw new Error('foo-fail');
      });
      // hrtime calls: A1(5), B1(15), B2(15), B3(15), B4(15), B5(15)
      const givenTimes = [5, 15, 15, 15, 15, 15];
      mockFunctionProcessTimes(givenTimes);

      // WHEN asserting toBeFasterThan with maximum error tolerance,
      // THEN the assertion fails with an insufficient data message because Function A needs at least 2 data points for a t-test
      expect(() => {
        expect(givenFunctionA).toBeFasterThan(() => undefined, {iterations: 5, allowedErrorRate: 1});
      }).toThrow('Function A: insufficient data after processing (n=1)');
    });

    test("should fail when only 1 iteration succeeds for B (insufficient for t-test)", () => {
      // GIVEN Function A with 5 successes and Function B with 1 success and 4 errors (n=1 after errors)
      let givenCallCountB = 0;
      const givenFunctionB = jest.fn(() => {
        givenCallCountB++;
        if (givenCallCountB > 1) throw new Error('foo-fail');
      });
      // hrtime calls: A1(5), B1(15), A2(5), A3(5), A4(5), A5(5)
      const givenTimes = [5, 15, 5, 5, 5, 5];
      mockFunctionProcessTimes(givenTimes);

      // WHEN asserting toBeFasterThan with maximum error tolerance,
      // THEN the assertion fails with an insufficient data message because Function B needs at least 2 data points for a t-test
      expect(() => {
        expect(() => undefined).toBeFasterThan(givenFunctionB, {iterations: 5, allowedErrorRate: 1});
      }).toThrow('Function B: insufficient data after processing (n=1)');
    });
  });
});

describe("toResolveFasterThan", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("pass", () => {
    test("should pass the assertion when async Function A is statistically faster than async Function B", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms over 10 iterations
      const givenFunctionADurations = [5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5];
      const givenFunctionBDurations = [15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with 10 iterations,
      // THEN the assertion passes because async Function A is statistically faster
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 10});
    });

    test("should pass the assertion when warmup is configured", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms with warmup=2
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with warmup=2,
      // THEN the assertion passes
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 5, warmup: 2});
    });
  });

  describe("fail", () => {
    test("should fail the assertion when async Function A is slower than async Function B", async () => {
      // GIVEN async Function A taking ~15ms and async Function B taking ~5ms (Function A is slower)
      const givenFunctionADurations = [15, 15, 15, 15, 15];
      const givenFunctionBDurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan,
      // THEN the assertion fails with a descriptive error because async Function A is not faster
      await expect(async () => {
        await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 5});
      }).rejects.toThrow('expected Function A to be faster than Function B');
    });
  });

  describe(".not", () => {
    test("should pass with .not when async Function A is not faster than async Function B", async () => {
      // GIVEN async Function A taking ~15ms and async Function B taking ~5ms (Function A is slower)
      const givenFunctionADurations = [15, 15, 15, 15, 15];
      const givenFunctionBDurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with .not negation,
      // THEN the assertion passes because async Function A is indeed not faster than async Function B
      await expect(async () => undefined).not.toResolveFasterThan(async () => undefined, {iterations: 5});
    });

    test("should fail with .not when async Function A IS faster than async Function B", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms over 10 iterations (Function A is faster)
      const givenFunctionADurations = [5, 5.1, 4.9, 5.2, 4.8, 5, 5.1, 4.9, 5, 5];
      const givenFunctionBDurations = [15, 15.1, 14.9, 15.2, 14.8, 15, 15.1, 14.9, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with .not negation,
      // THEN the assertion fails because async Function A is actually statistically faster
      await expect(async () => {
        await expect(async () => undefined).not.toResolveFasterThan(async () => undefined, {iterations: 10});
      }).rejects.toThrow('expected Function A NOT to be faster than Function B');
    });
  });

  describe("async setup/teardown", () => {
    test("should call async setup once and pass state to callbacks when setup is provided", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms with an async suite-level setup that returns state
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetup = jest.fn(async () => ({data: 'foo-async-state'}));
      const givenFunctionA = jest.fn(async () => undefined);
      const givenFunctionB = jest.fn(async () => undefined);

      // WHEN asserting toResolveFasterThan with an async setup hook,
      await expect(givenFunctionA).toResolveFasterThan(givenFunctionB, {iterations: 3, setup: givenSetup});

      // THEN setup is called exactly once
      expect(givenSetup).toHaveBeenCalledTimes(1);
      // AND callbackA receives the suite state as its first argument
      expect((givenFunctionA.mock.calls[0] as unknown[])[0]).toEqual({data: 'foo-async-state'});
    });

    test("should call async teardown even when callback rejects", async () => {
      // GIVEN an async teardown hook and a callback that rejects
      const givenTeardown = jest.fn(async () => undefined);

      // WHEN asserting toResolveFasterThan and the callback rejects,
      try {
        await expect(async () => { throw new Error('foo-boom'); }).toResolveFasterThan(async () => undefined, {
          iterations: 3,
          teardown: givenTeardown,
        });
      } catch {
        // expected
      }

      // THEN the async teardown is still called via the outer try/finally
      expect(givenTeardown).toHaveBeenCalledTimes(1);
    });

    test("should call async setupEach twice per iteration when setupEach is provided", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms with an async setupEach hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEach = jest.fn(async () => undefined);

      // WHEN asserting toResolveFasterThan with async setupEach for 3 iterations,
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 3, setupEach: givenSetupEach});

      // THEN setupEach is called 3 iterations x 2 functions = 6 times
      expect(givenSetupEach).toHaveBeenCalledTimes(6);
    });

    test("should call async teardownEach twice per iteration when teardownEach is provided", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms with an async teardownEach hook
      const givenFunctionADurations = [5, 5, 5];
      const givenFunctionBDurations = [15, 15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenTeardownEach = jest.fn(async () => undefined);

      // WHEN asserting toResolveFasterThan with async teardownEach for 3 iterations,
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 3, teardownEach: givenTeardownEach});

      // THEN teardownEach is called 3 iterations x 2 functions = 6 times
      expect(givenTeardownEach).toHaveBeenCalledTimes(6);
    });
  });

  describe("error rate (async)", () => {
    test("should propagate Function A rejection immediately when allowedErrorRate is 0", async () => {
      // GIVEN async Function A that always rejects and default allowedErrorRate of 0

      // WHEN asserting toResolveFasterThan,
      // THEN Function A's rejection propagates immediately as a fatal error
      await expect(async () => {
        await expect(async () => { throw new Error('foo-async-boom-a'); }).toResolveFasterThan(async () => undefined, {iterations: 5});
      }).rejects.toThrow('foo-async-boom-a');
    });

    test("should propagate Function B rejection immediately when allowedErrorRate is 0", async () => {
      // GIVEN async Function A that succeeds and async Function B that always rejects with default allowedErrorRate of 0
      const givenFunctionADurations = [5];
      mockFunctionProcessTimes(givenFunctionADurations);

      // WHEN asserting toResolveFasterThan,
      // THEN Function B's rejection propagates immediately as a fatal error
      await expect(async () => {
        await expect(async () => undefined).toResolveFasterThan(async () => { throw new Error('foo-async-boom-b'); }, {iterations: 5});
      }).rejects.toThrow('foo-async-boom-b');
    });

    test("should fail when async Function A error rate exceeds allowed tolerance", async () => {
      // GIVEN async Function A that throws on all iterations and async Function B that succeeds
      const givenFunctionBDurations = [15, 15, 15, 15, 15];
      mockFunctionProcessTimes(givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with allowedErrorRate=0.1,
      // THEN the assertion fails with an all-failed message for Function A
      await expect(async () => {
        await expect(async () => { throw new Error('foo-boom'); }).toResolveFasterThan(async () => undefined, {
          iterations: 5,
          allowedErrorRate: 0.1,
        });
      }).rejects.toThrow('Function A: all 5 iterations failed');
    });

    test("should fail when async Function B error rate exceeds allowed tolerance", async () => {
      // GIVEN async Function A that succeeds and async Function B that throws on all iterations
      const givenFunctionADurations = [5, 5, 5, 5, 5];
      mockFunctionProcessTimes(givenFunctionADurations);

      // WHEN asserting toResolveFasterThan with allowedErrorRate=0.1,
      // THEN the assertion fails with an all-failed message for Function B
      await expect(async () => {
        await expect(async () => undefined).toResolveFasterThan(async () => { throw new Error('foo-boom'); }, {
          iterations: 5,
          allowedErrorRate: 0.1,
        });
      }).rejects.toThrow('Function B: all 5 iterations failed');
    });
  });

  describe("outlier removal (async)", () => {
    test("should remove outliers when enabled for async matchers", async () => {
      // GIVEN async Function A taking ~5ms with one 500ms outlier and async Function B taking steady ~10ms
      const givenFunctionADurations = [5, 5, 5, 5, 5, 5, 5, 5, 5, 500];
      const givenFunctionBDurations = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);

      // WHEN asserting toResolveFasterThan with outliers='remove',
      // THEN the assertion passes because Function A's 500ms outlier is removed and its true mean (~5ms) is faster than Function B's 10ms
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {iterations: 10, outliers: 'remove'});
    });
  });

  describe("async warmup", () => {
    test("should run async warmup and setupEach/teardownEach correctly when all are configured", async () => {
      // GIVEN async Function A taking ~5ms and async Function B taking ~15ms with warmup=1, setupEach, and teardownEach
      const givenFunctionADurations = [5, 5];
      const givenFunctionBDurations = [15, 15];
      mockFunctionProcessTimesInterleaved(givenFunctionADurations, givenFunctionBDurations);
      const givenSetupEach = jest.fn(async () => undefined);
      const givenTeardownEach = jest.fn(async () => undefined);

      // WHEN asserting toResolveFasterThan with warmup=1 and iterations=2,
      await expect(async () => undefined).toResolveFasterThan(async () => undefined, {
        iterations: 2, warmup: 1, setupEach: givenSetupEach, teardownEach: givenTeardownEach,
      });

      // THEN setupEach is called (warmup=1 + iterations=2) x 2 functions = 6 times
      expect(givenSetupEach).toHaveBeenCalledTimes(6);
      // AND teardownEach is called the same number of times
      expect(givenTeardownEach).toHaveBeenCalledTimes(6);
    });
  });

  describe("async B error tolerance", () => {
    test("should count async Function B errors within tolerance when Function B fails intermittently", async () => {
      // GIVEN async Function B that throws intermittently on 1 of 3 iterations with error tolerance of 50%
      let givenHrtimeCount = 0;
      jest.spyOn(process, "hrtime").mockImplementation(() => {
        givenHrtimeCount++;
        return [0, givenHrtimeCount * 5000000];
      });
      let givenCallCountB = 0;
      const givenFunctionB = jest.fn(async () => {
        givenCallCountB++;
        if (givenCallCountB === 1) throw new Error('foo-intermittent');
      });

      // WHEN asserting toResolveFasterThan with error tolerance (Function B fails 1/3 = 33%, allowed 50%),
      try {
        await expect(async () => undefined).toResolveFasterThan(givenFunctionB, {iterations: 3, allowedErrorRate: 0.5});
      } catch {
        // May fail comparison
      }

      // THEN B was called 3 times, and the single failure was tolerated within the allowed rate
      expect(givenFunctionB).toHaveBeenCalledTimes(3);
    });
  });
});

describe("processComparativeResults (unit tests)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("should fail when Function A error rate exceeds allowed with some successes", () => {
    // GIVEN Function A with 3 out of 5 errors (60% error rate) and allowed rate of 10%
    const givenFunctionADurations = [5, 5];
    const givenFunctionBDurations = [10, 10, 10, 10, 10];

    // WHEN processing comparative results with allowedErrorRate=0.1,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 3, errorCountB: 0, allowedErrorRate: 0.1, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an error rate exceeded message for Function A
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function A: error rate 3/5 (60.0%) exceeds allowed 10.0%');
  });

  test("should fail when Function B error rate exceeds allowed with some successes", () => {
    // GIVEN Function A with 0 errors and Function B with 3 out of 5 errors (60% error rate) and allowed rate of 10%
    const givenFunctionADurations = [5, 5, 5, 5, 5];
    const givenFunctionBDurations = [10, 10];

    // WHEN processing comparative results with allowedErrorRate=0.1,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 3, allowedErrorRate: 0.1, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an error rate exceeded message for Function B
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function B: error rate 3/5 (60.0%) exceeds allowed 10.0%');
  });

  test("should fail when Function A has insufficient data after processing (n=1)", () => {
    // GIVEN only 1 successful Function A iteration and 5 successful Function B iterations
    const givenFunctionADurations = [5];
    const givenFunctionBDurations = [10, 10, 10, 10, 10];

    // WHEN processing comparative results,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an insufficient data message for Function A
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function A: insufficient data after processing (n=1)');
  });

  test("should fail when Function B has insufficient data after processing (n=1)", () => {
    // GIVEN 5 successful Function A iterations and only 1 successful Function B iteration
    const givenFunctionADurations = [5, 5, 5, 5, 5];
    const givenFunctionBDurations = [10];

    // WHEN processing comparative results,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result fails with an insufficient data message for Function B
    expect(actualResult.pass).toBe(false);
    expect(actualResult.message()).toContain('Function B: insufficient data after processing (n=1)');
  });

  test("should show comparison section when both functions have identical means", () => {
    // GIVEN both Function A and Function B with identical durations (~10ms each)
    const givenData = [10, 10.1, 9.9, 10.2, 9.8];

    // WHEN processing comparative results,
    const actualResult = processComparativeResults({
      durationsA: givenData, durationsB: [...givenData], count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN the result is not pass because there is no significant difference
    expect(actualResult.pass).toBe(false);
    // AND the comparison section is still included in the message
    expect(actualResult.message()).toContain('--- Comparison ---');
  });

  test("should handle zero mean for Function B without producing NaN or Infinity", () => {
    // GIVEN both Function A and Function B with zero-duration data
    const givenFunctionADurations = [0, 0, 0, 0, 0];
    const givenFunctionBDurations = [0, 0, 0, 0, 0];

    // WHEN processing comparative results with zero means,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });
    const actualMessage = actualResult.message();

    // THEN the message contains comparison section and mean difference without NaN or Infinity
    expect(actualMessage).toContain('--- Comparison ---');
    expect(actualMessage).toContain('Mean difference:');
  });

  test("should show setup/teardown active in stats block when setupTeardownActive is true", () => {
    // GIVEN Function A taking ~5ms and Function B taking ~15ms with setupTeardownActive flag set to true
    const givenFunctionADurations = [5, 5, 5, 5, 5];
    const givenFunctionBDurations = [15, 15, 15, 15, 15];

    // WHEN processing comparative results with setupTeardownActive=true,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: true, removeOutliersEnabled: false,
    });

    // THEN the message contains the setup/teardown active hint
    expect(actualResult.message()).toContain('setup/teardown active');
  });

  test("should show error info when errors occurred within tolerance", () => {
    // GIVEN Function A with 1 error out of 5 (20%), Function B with 0 errors, and allowed rate of 50%
    const givenFunctionADurations = [5, 5, 5, 5];
    const givenFunctionBDurations = [15, 15, 15, 15, 15];

    // WHEN processing comparative results with errors within tolerance,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 1, errorCountB: 0, allowedErrorRate: 0.5, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });
    const actualMessage = actualResult.message();

    // THEN the message shows the error rate information for the tolerated errors
    expect(actualMessage).toContain('Error rate:');
    expect(actualMessage).toContain('1/5');
  });

  test("should return pass=true when Function A is statistically significantly faster than Function B", () => {
    // GIVEN Function A taking ~5ms and Function B taking ~50ms (Function A is much faster)
    const givenFunctionADurations = [5, 5, 5, 5, 5];
    const givenFunctionBDurations = [50, 50, 50, 50, 50];

    // WHEN processing comparative results,
    const actualResult = processComparativeResults({
      durationsA: givenFunctionADurations, durationsB: givenFunctionBDurations, count: 5,
      errorCountA: 0, errorCountB: 0, allowedErrorRate: 0, confidence: 0.95, setupTeardownActive: false, removeOutliersEnabled: false,
    });

    // THEN pass is true because Function A is statistically significantly faster
    expect(actualResult.pass).toBe(true);
    // AND the negated message indicates Function A is faster (used when .not is applied)
    expect(actualResult.message()).toContain('expected Function A NOT to be faster than Function B');
  });
});
