import {nowInMillis} from "./timing";
import {validateCallback, validateDuration, validateQuantileOptions} from "./validators";
import {processQuantileResults} from "./helpers";

interface QuantileHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type SyncCallback = (...args: any[]) => unknown;

function warmupSync(callback: SyncCallback, warmupCount: number, suiteState: unknown, hooks: QuantileHooks): void {
  for (let i = 0; i < warmupCount; i++) {
    const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
    try {
      callback(suiteState, iterState);
    } finally {
      if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
    }
  }
}

function measureSync(callback: SyncCallback, suiteState: unknown, durations: number[], hooks: QuantileHooks, allowedErrorRate: number): number {
  let errorCount = 0;
  const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
  try {
    const t0 = nowInMillis();
    callback(suiteState, iterState);
    const t1 = nowInMillis();
    durations.push(t1 - t0);
  } catch (e) {
    if (allowedErrorRate === 0) throw e;
    errorCount = 1;
  } finally {
    if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
  }
  return errorCount;
}

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
  const hooks: QuantileHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? hooks.setup() : undefined;

  try {
    warmupSync(callback, options.warmup ?? 0, suiteState, hooks);

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      errorCount += measureSync(callback, suiteState, durations, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove'});
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type AsyncCallback = (...args: any[]) => Promise<unknown>;

interface AsyncQuantileHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void | Promise<void>;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>;
}

async function warmupAsync(callback: AsyncCallback, warmupCount: number, suiteState: unknown, hooks: AsyncQuantileHooks): Promise<void> {
  for (let i = 0; i < warmupCount; i++) {
    const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
    try {
      await callback(suiteState, iterState);
    } finally {
      if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
    }
  }
}

async function measureAsync(callback: AsyncCallback, suiteState: unknown, durations: number[], hooks: AsyncQuantileHooks, allowedErrorRate: number): Promise<number> {
  let errorCount = 0;
  const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
  try {
    const t0 = nowInMillis();
    await callback(suiteState, iterState);
    const t1 = nowInMillis();
    durations.push(t1 - t0);
  } catch (e) {
    if (allowedErrorRate === 0) throw e;
    errorCount = 1;
  } finally {
    if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
  }
  return errorCount;
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
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
}) {
  validateCallback(promise);
  validateDuration(expectedDurationInMilliseconds);
  validateQuantileOptions(options);

  const count = options.iterations;
  const quantile = options.quantile;
  const hooks: AsyncQuantileHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? await hooks.setup() : undefined;

  try {
    await warmupAsync(promise, options.warmup ?? 0, suiteState, hooks);

    const durations: number[] = [];
    let errorCount = 0;
    for (let i = 0; i < count; i++) {
      errorCount += await measureAsync(promise, suiteState, durations, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processQuantileResults({durations, count, quantile, errorCount, allowedErrorRate, expectedDurationInMilliseconds, setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove'});
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
