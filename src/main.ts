import {expect} from '@jest/globals';
import {toCompleteWithin, toResolveWithin} from './matchers-single';
import {toCompleteWithinQuantile, toResolveWithinQuantile} from './matchers-quantile';

expect.extend({
  toCompleteWithin,
  toCompleteWithinQuantile,
  toResolveWithin,
  toResolveWithinQuantile
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
      }): Promise<R>;
    }
  }
}
