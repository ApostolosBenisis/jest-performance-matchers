import {nowInMillis} from "./timing";
import {validateCallback, validateDuration, validateQuantileOptions} from "./validators";
import {processQuantileResults} from "./helpers";

/**
 * Assert that the synchronous code executed for (I) times, runs (Q)% the time within the given duration
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export function toCompleteWithinQuantile(callback: (...args: any[]) => unknown, expectedDurationInMilliseconds: number, options: {
  iterations: number,
  quantile: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void,
  allowedErrorRate?: number,
}) {
  validateCallback(callback);
  validateDuration(expectedDurationInMilliseconds);
  validateQuantileOptions(options);

  const count = options.iterations;
  const quantile = options.quantile;
  const warmup = options.warmup ?? 0;
  const {setup, teardown, setupEach, teardownEach} = options;

  const suiteState = setup ? setup() : undefined;

  const allowedErrorRate = options.allowedErrorRate ?? 0;

  try {
    for (let i = 0; i < warmup; i++) {
      const iterState = setupEach ? setupEach(suiteState) : undefined;
      try {
        callback(suiteState, iterState);
      } finally {
        if (teardownEach) teardownEach(suiteState, iterState);
      }
    }

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      const iterState = setupEach ? setupEach(suiteState) : undefined;
      try {
        const t0 = nowInMillis();
        callback(suiteState, iterState);
        const t1 = nowInMillis();
        durations.push(t1 - t0);
      } catch (e) {
        if (allowedErrorRate === 0) throw e;
        errorCount++;
      } finally {
        if (teardownEach) teardownEach(suiteState, iterState);
      }
    }

    const setupTeardownActive = !!(setup || teardown || setupEach || teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove'});
  } finally {
    if (teardown) teardown(suiteState);
  }
}

/**
 * Assert that the asynchronous code executed for (I) times, resolves (Q)% the time within the given duration
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export async function toResolveWithinQuantile(promise: (...args: any[]) => Promise<unknown>, expectedDurationInMilliseconds: number, options: {
  iterations: number,
  quantile: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown | Promise<unknown>,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown | Promise<unknown>,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
}) {
  validateCallback(promise);
  validateDuration(expectedDurationInMilliseconds);
  validateQuantileOptions(options);

  const count = options.iterations;
  const quantile = options.quantile;
  const warmup = options.warmup ?? 0;
  const {setup, teardown, setupEach, teardownEach} = options;

  const suiteState = setup ? await setup() : undefined;
  const allowedErrorRate = options.allowedErrorRate ?? 0;

  try {
    for (let i = 0; i < warmup; i++) {
      const iterState = setupEach ? await setupEach(suiteState) : undefined;
      try {
        await promise(suiteState, iterState);
      } finally {
        if (teardownEach) await teardownEach(suiteState, iterState);
      }
    }

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      const iterState = setupEach ? await setupEach(suiteState) : undefined;
      try {
        const t0 = nowInMillis();
        await promise(suiteState, iterState);
        const t1 = nowInMillis();
        durations.push(t1 - t0);
      } catch (e) {
        if (allowedErrorRate === 0) throw e;
        errorCount++;
      } finally {
        if (teardownEach) await teardownEach(suiteState, iterState);
      }
    }

    const setupTeardownActive = !!(setup || teardown || setupEach || teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove'});
  } finally {
    if (teardown) await teardown(suiteState);
  }
}
