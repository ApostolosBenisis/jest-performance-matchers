import {nowInMillis} from "./timing";
import {validateCallback, validateExpectedOpsPerSecond, validateThroughputOptions} from "./validators";
import {processThroughputResults} from "./helpers";

interface ThroughputHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type SyncCallback = (...args: any[]) => unknown;

function warmupSync(callback: SyncCallback, warmupCount: number, suiteState: unknown, hooks: ThroughputHooks): void {
  for (let i = 0; i < warmupCount; i++) {
    const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
    try {
      callback(suiteState, iterState);
    } finally {
      if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
    }
  }
}

function measureSyncThroughput(
  callback: SyncCallback, duration: number, suiteState: unknown,
  hooks: ThroughputHooks, allowedErrorRate: number,
): { durations: number[]; errorCount: number } {
  const durations: number[] = [];
  let errorCount = 0;
  const deadline = nowInMillis() + duration;

  while (nowInMillis() < deadline) {
    const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
    try {
      const t0 = nowInMillis();
      callback(suiteState, iterState);
      const t1 = nowInMillis();
      durations.push(t1 - t0);
    } catch (e) {
      if (allowedErrorRate === 0) throw e;
      errorCount++;
    } finally {
      if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
    }
  }

  return {durations, errorCount};
}

/**
 * Assert that a synchronous function achieves at least the expected ops/sec
 * over a time-bounded measurement window.
 */
export function toAchieveOpsPerSecond(callback: SyncCallback, expectedOpsPerSecond: number, options: {
  duration: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void,
  allowedErrorRate?: number,
}) {
  validateCallback(callback);
  validateExpectedOpsPerSecond(expectedOpsPerSecond);
  validateThroughputOptions(options);

  const hooks: ThroughputHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? hooks.setup() : undefined;

  try {
    warmupSync(callback, options.warmup ?? 0, suiteState, hooks);

    const {durations, errorCount} = measureSyncThroughput(callback, options.duration, suiteState, hooks, allowedErrorRate);
    const totalOps = durations.length + errorCount;
    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);

    return processThroughputResults({
      durations, totalOps, errorCount, allowedErrorRate,
      expectedOpsPerSecond, duration: options.duration,
      setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove',
    });
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
type AsyncCallback = (...args: any[]) => Promise<unknown>;

interface AsyncThroughputHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void | Promise<void>;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>;
}

async function warmupAsync(callback: AsyncCallback, warmupCount: number, suiteState: unknown, hooks: AsyncThroughputHooks): Promise<void> {
  for (let i = 0; i < warmupCount; i++) {
    const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
    try {
      await callback(suiteState, iterState);
    } finally {
      if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
    }
  }
}

async function measureAsyncThroughput(
  callback: AsyncCallback, duration: number, suiteState: unknown,
  hooks: AsyncThroughputHooks, allowedErrorRate: number,
): Promise<{ durations: number[]; errorCount: number }> {
  const durations: number[] = [];
  let errorCount = 0;
  const deadline = nowInMillis() + duration;

  while (nowInMillis() < deadline) {
    const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
    try {
      const t0 = nowInMillis();
      await callback(suiteState, iterState);
      const t1 = nowInMillis();
      durations.push(t1 - t0);
    } catch (e) {
      if (allowedErrorRate === 0) throw e;
      errorCount++;
    } finally {
      if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
    }
  }

  return {durations, errorCount};
}

/**
 * Assert that an asynchronous function achieves at least the expected ops/sec
 * over a time-bounded measurement window.
 */
export async function toResolveAtOpsPerSecond(callback: AsyncCallback, expectedOpsPerSecond: number, options: {
  duration: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
}) {
  validateCallback(callback);
  validateExpectedOpsPerSecond(expectedOpsPerSecond);
  validateThroughputOptions(options);

  const hooks: AsyncThroughputHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const suiteState = hooks.setup ? await hooks.setup() : undefined;

  try {
    await warmupAsync(callback, options.warmup ?? 0, suiteState, hooks);

    const {durations, errorCount} = await measureAsyncThroughput(callback, options.duration, suiteState, hooks, allowedErrorRate);
    const totalOps = durations.length + errorCount;
    const setupTeardownActive = !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach);

    return processThroughputResults({
      durations, totalOps, errorCount, allowedErrorRate,
      expectedOpsPerSecond, duration: options.duration,
      setupTeardownActive, removeOutliersEnabled: options.outliers === 'remove',
    });
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
