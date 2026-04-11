import {nowInMillis} from "./timing";
import {validateCallback, validateDuration, validateSetupTeardown} from "./validators";
import {assertDuration} from "./helpers";

/**
 * Assert that the synchronous code runs within the given duration.
 * @param callback The callback to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Optional setup/teardown hooks — setup runs before timing, teardown after
 **/
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export function toCompleteWithin(callback: (state: any) => unknown, expectedDurationInMilliseconds: number, options?: {
  setup?: () => unknown,
  teardown?: (state: unknown) => void,
}) {
  validateCallback(callback);
  validateDuration(expectedDurationInMilliseconds);
  validateSetupTeardown(options);

  const setupResult = options?.setup ? options.setup() : undefined;
  let actualDuration: number;
  try {
    const t0 = nowInMillis();
    callback(setupResult);
    const t1 = nowInMillis();
    actualDuration = t1 - t0;
  } finally {
    if (options?.teardown) options.teardown(setupResult);
  }

  return assertDuration(actualDuration, expectedDurationInMilliseconds);
}

/**
 * Assert that the asynchronous code resolves within the given duration.
 * @param promise The promise to execute and measure
 * @param expectedDurationInMilliseconds The expected duration in milliseconds
 * @param options Optional setup/teardown hooks — setup runs before timing, teardown after
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect.extend erases generics at runtime
export async function toResolveWithin(promise: (state: any) => Promise<unknown>, expectedDurationInMilliseconds: number, options?: {
  setup?: () => unknown | Promise<unknown>,
  teardown?: (state: unknown) => void | Promise<void>,
}) {
  validateCallback(promise);
  validateDuration(expectedDurationInMilliseconds);
  validateSetupTeardown(options);

  const setupResult = options?.setup ? await options.setup() : undefined;
  let actualDuration: number;
  try {
    const t0 = nowInMillis();
    await promise(setupResult);
    const t1 = nowInMillis();
    actualDuration = t1 - t0;
  } finally {
    if (options?.teardown) await options.teardown(setupResult);
  }
  return assertDuration(actualDuration, expectedDurationInMilliseconds);
}
