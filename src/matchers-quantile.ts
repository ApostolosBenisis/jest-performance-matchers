import {validateCallback, validateDuration, validateQuantileOptions} from "./validators";
import {processQuantileResults} from "./helpers";
import {SyncHooks, AsyncHooks, SyncCallback, AsyncCallback, measureSync, measureAsync, warmupSync, warmupAsync} from "./hooks";

/**
 * Assert that the synchronous code executed for (I) times, runs (Q)% the time within the given duration
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
export function toCompleteWithinQuantile(callback: SyncCallback, expectedDurationInMilliseconds: number, options: {
  iterations: number,
  quantile: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void,
  allowedErrorRate?: number,
  logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
}) {
  validateCallback(callback);
  validateDuration(expectedDurationInMilliseconds);
  validateQuantileOptions(options);

  const count = options.iterations;
  const quantile = options.quantile;
  const hooks: SyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
  const suiteState = hooks.setup ? hooks.setup() : undefined;

  try {
    warmupSync(callback, options.warmup ?? 0, suiteState, hooks);

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      errorCount += measureSync(callback, suiteState, durations, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove', logDiagnostics});
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

/**
 * Assert that the asynchronous code executed for (I) times, resolves (Q)% the time within the given duration
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Iteration count, quantile threshold, and optional setup/teardown hooks
 */
export async function toResolveWithinQuantile(promise: AsyncCallback, expectedDurationInMilliseconds: number, options: {
  iterations: number,
  quantile: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
  logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
}) {
  validateCallback(promise);
  validateDuration(expectedDurationInMilliseconds);
  validateQuantileOptions(options);

  const count = options.iterations;
  const quantile = options.quantile;
  const hooks: AsyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
  const suiteState = hooks.setup ? await hooks.setup() : undefined;

  try {
    await warmupAsync(promise, options.warmup ?? 0, suiteState, hooks);

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      errorCount += await measureAsync(promise, suiteState, durations, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove', logDiagnostics});
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
