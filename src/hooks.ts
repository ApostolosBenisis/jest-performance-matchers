/** Shared lifecycle hooks and execution helpers for sync and async matchers. */

import {nowInMillis} from "./timing";

export interface SyncHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void;
}

export interface AsyncHooks {
  setup?: () => unknown;
  teardown?: (suiteState: unknown) => void | Promise<void>;
  setupEach?: (suiteState: unknown) => unknown;
  teardownEach?: (suiteState: unknown, iterState: unknown) => void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export type SyncCallback = (...args: any[]) => unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export type AsyncCallback = (...args: any[]) => Promise<unknown>;

export function runSyncWithHooks(callback: SyncCallback, suiteState: unknown, hooks: SyncHooks): void {
  const iterState = hooks.setupEach ? hooks.setupEach(suiteState) : undefined;
  try {
    callback(suiteState, iterState);
  } finally {
    if (hooks.teardownEach) hooks.teardownEach(suiteState, iterState);
  }
}

export async function runAsyncWithHooks(callback: AsyncCallback, suiteState: unknown, hooks: AsyncHooks): Promise<void> {
  const iterState = hooks.setupEach ? await hooks.setupEach(suiteState) : undefined;
  try {
    await callback(suiteState, iterState);
  } finally {
    if (hooks.teardownEach) await hooks.teardownEach(suiteState, iterState);
  }
}

export function measureSync(callback: SyncCallback, suiteState: unknown, durations: number[], hooks: SyncHooks, allowedErrorRate: number): number {
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

export async function measureAsync(callback: AsyncCallback, suiteState: unknown, durations: number[], hooks: AsyncHooks, allowedErrorRate: number): Promise<number> {
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

export function warmupSync(callback: SyncCallback, warmupCount: number, suiteState: unknown, hooks: SyncHooks): void {
  for (let i = 0; i < warmupCount; i++) {
    runSyncWithHooks(callback, suiteState, hooks);
  }
}

export async function warmupAsync(callback: AsyncCallback, warmupCount: number, suiteState: unknown, hooks: AsyncHooks): Promise<void> {
  for (let i = 0; i < warmupCount; i++) {
    await runAsyncWithHooks(callback, suiteState, hooks);
  }
}
