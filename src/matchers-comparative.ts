import {validateCallback, validateComparativeOptions} from "./validators";
import {processComparativeResults} from "./helpers";
import {SyncHooks, AsyncHooks, SyncCallback, AsyncCallback, runSyncWithHooks, runAsyncWithHooks, measureSync, measureAsync} from "./hooks";

function warmupSync(callbackA: SyncCallback, callbackB: SyncCallback, warmupCount: number, suiteState: unknown, hooks: SyncHooks): void {
  for (let i = 0; i < warmupCount; i++) {
    runSyncWithHooks(callbackA, suiteState, hooks);
    runSyncWithHooks(callbackB, suiteState, hooks);
  }
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
  logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
}) {
  validateCallback(callbackA);
  validateCallback(callbackB);
  validateComparativeOptions(options);

  const count = options.iterations;
  const confidence = options.confidence ?? 0.95;
  const hooks: SyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
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
      logDiagnostics,
    });
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

async function warmupAsync(callbackA: AsyncCallback, callbackB: AsyncCallback, warmupCount: number, suiteState: unknown, hooks: AsyncHooks): Promise<void> {
  for (let i = 0; i < warmupCount; i++) {
    await runAsyncWithHooks(callbackA, suiteState, hooks);
    await runAsyncWithHooks(callbackB, suiteState, hooks);
  }
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
  setup?: () => unknown,
  teardown?: (suiteState: unknown) => void | Promise<void>,
  setupEach?: (suiteState: unknown) => unknown,
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>,
  allowedErrorRate?: number,
  logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
}) {
  validateCallback(promiseA);
  validateCallback(promiseB);
  validateComparativeOptions(options);

  const count = options.iterations;
  const confidence = options.confidence ?? 0.95;
  const hooks: AsyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
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
      logDiagnostics,
    });
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
