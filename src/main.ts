import {expect} from '@jest/globals';
import {toCompleteWithin, toResolveWithin} from './matchers-single';
import {toCompleteWithinQuantile, toResolveWithinQuantile} from './matchers-quantile';
import {toBeFasterThan, toResolveFasterThan} from './matchers-comparative';
import {toAchieveOpsPerSecond, toResolveAtOpsPerSecond} from './matchers-throughput';
import {toHaveHigherThroughputThan, toResolveWithHigherThroughputThan} from './matchers-comparative-throughput';

expect.extend({
  toCompleteWithin,
  toCompleteWithinQuantile,
  toResolveWithin,
  toResolveWithinQuantile,
  toBeFasterThan,
  toResolveFasterThan,
  toAchieveOpsPerSecond,
  toResolveAtOpsPerSecond,
  toHaveHigherThroughputThan,
  toResolveWithHigherThroughputThan,
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toCompleteWithin<T = void>(expectedDurationInMilliseconds: number, options?: {
        setup?: () => T,
        teardown?: (state: T) => void,
      }): R;

      toCompleteWithinQuantile<T = void, U = void>(expectedDurationInMilliseconds: number, options: {
        iterations: number,
        quantile: number,
        warmup?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T,
        teardown?: (suiteState: T) => void,
        setupEach?: (suiteState: T) => U,
        teardownEach?: (suiteState: T, iterState: U) => void,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): R;

      toResolveWithin<T = void>(expectedDurationInMilliseconds: number, options?: {
        setup?: () => T | Promise<T>,
        teardown?: (state: T) => void | Promise<void>,
      }): Promise<R>;

      toResolveWithinQuantile<T = void, U = void>(expectedDurationInMilliseconds: number, options: {
        iterations: number,
        quantile: number,
        warmup?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T | Promise<T>,
        teardown?: (suiteState: T) => void | Promise<void>,
        setupEach?: (suiteState: T) => U | Promise<U>,
        teardownEach?: (suiteState: T, iterState: U) => void | Promise<void>,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): Promise<R>;

      toBeFasterThan<T = void, U = void>(comparisonFn: (...args: unknown[]) => unknown, options: {
        iterations: number,
        warmup?: number,
        confidence?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T,
        teardown?: (suiteState: T) => void,
        setupEach?: (suiteState: T) => U,
        teardownEach?: (suiteState: T, iterState: U) => void,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): R;

      toResolveFasterThan<T = void, U = void>(comparisonFn: (...args: unknown[]) => Promise<unknown>, options: {
        iterations: number,
        warmup?: number,
        confidence?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T | Promise<T>,
        teardown?: (suiteState: T) => void | Promise<void>,
        setupEach?: (suiteState: T) => U | Promise<U>,
        teardownEach?: (suiteState: T, iterState: U) => void | Promise<void>,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): Promise<R>;

      toAchieveOpsPerSecond<T = void, U = void>(expectedOpsPerSecond: number, options: {
        duration: number,
        warmup?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T,
        teardown?: (suiteState: T) => void,
        setupEach?: (suiteState: T) => U,
        teardownEach?: (suiteState: T, iterState: U) => void,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): R;

      toResolveAtOpsPerSecond<T = void, U = void>(expectedOpsPerSecond: number, options: {
        duration: number,
        warmup?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T | Promise<T>,
        teardown?: (suiteState: T) => void | Promise<void>,
        setupEach?: (suiteState: T) => U | Promise<U>,
        teardownEach?: (suiteState: T, iterState: U) => void | Promise<void>,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): Promise<R>;

      toHaveHigherThroughputThan<T = void, U = void>(comparisonFn: (...args: unknown[]) => unknown, options: {
        duration: number,
        warmup?: number,
        confidence?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T,
        teardown?: (suiteState: T) => void,
        setupEach?: (suiteState: T) => U,
        teardownEach?: (suiteState: T, iterState: U) => void,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): R;

      toResolveWithHigherThroughputThan<T = void, U = void>(comparisonFn: (...args: unknown[]) => Promise<unknown>, options: {
        duration: number,
        warmup?: number,
        confidence?: number,
        outliers?: 'remove' | 'keep',
        setup?: () => T | Promise<T>,
        teardown?: (suiteState: T) => void | Promise<void>,
        setupEach?: (suiteState: T) => U | Promise<U>,
        teardownEach?: (suiteState: T, iterState: U) => void | Promise<void>,
        allowedErrorRate?: number,
        logDiagnostics?: 'INFO' | 'WARN' | 'FAIL',
      }): Promise<R>;
    }
  }
}
