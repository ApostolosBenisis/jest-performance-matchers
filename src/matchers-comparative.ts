import {nowInMillis} from "./timing";
import {validateCallback, validateComparativeOptions} from "./validators";
import {processComparativeResults} from "./helpers";

interface ComparativeHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type SyncCallback = (...args: any[]) => unknown;

function warmupSync(callbackA: SyncCallback, callbackB: SyncCallback, warmupCount: number, suiteState: unknown, hooks: ComparativeHooks): void {
  for (let i = 0; i < warmupCount; i++) {
    runSyncWithHooks(callbackA, suiteState, hooks);
    runSyncWithHooks(callbackB, suiteState, hooks);
  }
}

function runSyncWithHooks(callback: SyncCallback, suiteState: unknown, hooks: ComparativeHooks): void {
  const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
  try {
    callback(suiteState, iterState);
  } finally {
    if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
  }
}

function measureSync(callback: SyncCallback, suiteState: unknown, durations: number[], hooks: ComparativeHooks, allowedErrorRate: number): number {
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
 * Assert that synchronous function A is statistically faster than function B
 * using Welch's t-test across N iterations.
 */
export function toBeFasterThan(callbackA: SyncCallback, callbackB: SyncCallback, options: {
  iterations: number,
  warmup?: number,
  confidence?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void,
  allowedErrorRate?: number,
}) {
  validateCallback(callbackA);
  validateCallback(callbackB);
  validateComparativeOptions(options);

  const count = options.iterations;
  const confidence = options.confidence ?? 0.95;
  const hooks: ComparativeHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? hooks.setup() : undefined;

  try {
    warmupSync(callbackA, callbackB, options.warmup ?? 0, suiteState, hooks);

    const durationsA: number[] = [];
    const durationsB: number[] = [];
    let errorCountA = 0;
    let errorCountB = 0;

    for (let i = 0; i < count; i++) {
      errorCountA += measureSync(callbackA, suiteState, durationsA, hooks, allowedErrorRate);
      errorCountB += measureSync(callbackB, suiteState, durationsB, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processComparativeResults({
      durationsA, durationsB, count, errorCountA, errorCountB,
      allowedErrorRate, confidence, setupTeardownActive,
      removeOutliersEnabled: options.outliers === 'remove',
    });
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type AsyncCallback = (...args: any[]) => Promise<unknown>;

interface AsyncComparativeHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void | Promise<void>;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>;
}

async function warmupAsync(callbackA: AsyncCallback, callbackB: AsyncCallback, warmupCount: number, suiteState: unknown, hooks: AsyncComparativeHooks): Promise<void> {
  for (let i = 0; i < warmupCount; i++) {
    await runAsyncWithHooks(callbackA, suiteState, hooks);
    await runAsyncWithHooks(callbackB, suiteState, hooks);
  }
}

async function runAsyncWithHooks(callback: AsyncCallback, suiteState: unknown, hooks: AsyncComparativeHooks): Promise<void> {
  const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
  try {
    await callback(suiteState, iterState);
  } finally {
    if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
  }
}

async function measureAsync(callback: AsyncCallback, suiteState: unknown, durations: number[], hooks: AsyncComparativeHooks, allowedErrorRate: number): Promise<number> {
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
 * Assert that asynchronous function A is statistically faster than function B
 * using Welch's t-test across N iterations.
 */
export async function toResolveFasterThan(promiseA: AsyncCallback, promiseB: AsyncCallback, options: {
  iterations: number,
  warmup?: number,
  confidence?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown | Promise<unknown>,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown | Promise<unknown>,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
}) {
  validateCallback(promiseA);
  validateCallback(promiseB);
  validateComparativeOptions(options);

  const count = options.iterations;
  const confidence = options.confidence ?? 0.95;
  const hooks: AsyncComparativeHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? await hooks.setup() : undefined;

  try {
    await warmupAsync(promiseA, promiseB, options.warmup ?? 0, suiteState, hooks);

    const durationsA: number[] = [];
    const durationsB: number[] = [];
    let errorCountA = 0;
    let errorCountB = 0;

    for (let i = 0; i < count; i++) {
      errorCountA += await measureAsync(promiseA, suiteState, durationsA, hooks, allowedErrorRate);
      errorCountB += await measureAsync(promiseB, suiteState, durationsB, hooks, allowedErrorRate);
    }

    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);
    return processComparativeResults({
      durationsA, durationsB, count, errorCountA, errorCountB,
      allowedErrorRate, confidence, setupTeardownActive,
      removeOutliersEnabled: options.outliers === 'remove',
    });
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
