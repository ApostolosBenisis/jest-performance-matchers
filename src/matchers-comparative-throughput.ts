import {validateCallback, validateComparativeThroughputOptions} from "./validators";
import {processComparativeThroughputResults, LogDiagnostics, ComparativeThroughputResultsOptions} from "./helpers";
import {SyncHooks, AsyncHooks, SyncCallback, AsyncCallback, warmupSyncInterleaved, warmupAsyncInterleaved} from "./hooks";
import {measureSyncThroughput, measureAsyncThroughput} from "./matchers-throughput";

interface MeasurementResult {
  durations: number[];
  errorCount: number;
}

/** Build the options object passed to processComparativeThroughputResults from per-function measurement results. */
function buildResultsOptions(
  resultA: MeasurementResult,
  resultB: MeasurementResult,
  options: { duration: number; outliers?: 'remove' | 'keep' },
  hooks: SyncHooks | AsyncHooks,
  allowedErrorRate: number,
  confidence: number,
  logDiagnostics: LogDiagnostics,
): ComparativeThroughputResultsOptions {
  return {
    durationsA: resultA.durations, durationsB: resultB.durations,
    totalOpsA: resultA.durations.length + resultA.errorCount,
    totalOpsB: resultB.durations.length + resultB.errorCount,
    errorCountA: resultA.errorCount, errorCountB: resultB.errorCount,
    allowedErrorRate, confidence, duration: options.duration,
    setupTeardownActive: !!(hooks.setup || hooks.teardown || hooks.setupEach || hooks.teardownEach),
    removeOutliersEnabled: options.outliers === 'remove',
    logDiagnostics,
  };
}

/**
 * Assert that synchronous function A has statistically higher throughput than function B
 * using time-bounded measurement windows and Welch's t-test on per-op durations.
 */
export function toHaveHigherThroughputThan(callbackA: SyncCallback, callbackB: SyncCallback, options: {
  duration: number,
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
  validateComparativeThroughputOptions(options);

  const confidence = options.confidence ?? 0.95;
  const hooks: SyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
  const suiteState = hooks.setup ? hooks.setup() : undefined;

  try {
    warmupSyncInterleaved(callbackA, callbackB, options.warmup ?? 0, suiteState, hooks);

    const resultA = measureSyncThroughput(callbackA, options.duration, suiteState, hooks, allowedErrorRate);
    const resultB = measureSyncThroughput(callbackB, options.duration, suiteState, hooks, allowedErrorRate);

    return processComparativeThroughputResults(
      buildResultsOptions(resultA, resultB, options, hooks, allowedErrorRate, confidence, logDiagnostics),
    );
  } finally {
    if (hooks.teardown) hooks.teardown(suiteState);
  }
}

/**
 * Assert that asynchronous function A has statistically higher throughput than function B
 * using time-bounded measurement windows and Welch's t-test on per-op durations.
 */
export async function toResolveWithHigherThroughputThan(promiseA: AsyncCallback, promiseB: AsyncCallback, options: {
  duration: number,
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
  validateComparativeThroughputOptions(options);

  const confidence = options.confidence ?? 0.95;
  const hooks: AsyncHooks = options;
  const allowedErrorRate = options.allowedErrorRate ?? 0;
  const logDiagnostics = options.logDiagnostics ?? 'WARN';
  const suiteState = hooks.setup ? await hooks.setup() : undefined;

  try {
    await warmupAsyncInterleaved(promiseA, promiseB, options.warmup ?? 0, suiteState, hooks);

    const resultA = await measureAsyncThroughput(promiseA, options.duration, suiteState, hooks, allowedErrorRate);
    const resultB = await measureAsyncThroughput(promiseB, options.duration, suiteState, hooks, allowedErrorRate);

    return processComparativeThroughputResults(
      buildResultsOptions(resultA, resultB, options, hooks, allowedErrorRate, confidence, logDiagnostics),
    );
  } finally {
    if (hooks.teardown) await hooks.teardown(suiteState);
  }
}
