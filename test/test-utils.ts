export function mockFunctionProcessTime(milliseconds: number): void {
  mockFunctionProcessTimes([milliseconds]);
}

export function mockFunctionProcessTimes(milliseconds: number[]): void {
  let calledTimes = 0;
  jest.spyOn(process, "hrtime").mockImplementation(() => {
    calledTimes++;
    if (calledTimes % 2 !== 0) {
      return [1, 0];
    }
    return [1, 1000000 * milliseconds[calledTimes / 2 - 1]];
  });
}

export function mockFunctionProcessTimesInterleaved(durationsA: number[], durationsB: number[]): void {
  const interleaved: number[] = [];
  const len = Math.max(durationsA.length, durationsB.length);
  for (let i = 0; i < len; i++) {
    if (i < durationsA.length) interleaved.push(durationsA[i]);
    if (i < durationsB.length) interleaved.push(durationsB[i]);
  }
  mockFunctionProcessTimes(interleaved);
}

function msToHrtime(ms: number): [number, number] {
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.round((ms - seconds * 1000) * 1e6);
  return [seconds, nanos];
}

/**
 * Mock hrtime for throughput matchers that use a time-bounded while loop.
 *
 * Call pattern for successful ops: loop-check + t0 + t1 = 3 calls each
 * Call pattern for erroring ops: loop-check + t0 = 2 calls each (t1 is never reached)
 * Total: 1 (deadline) + 3*(N-E) + 2*E + 1 (exit check) = 3N - E + 2
 *
 * @param opDurations - array of per-operation durations in ms
 * @param durationWindow - the duration option passed to the matcher (ms)
 * @param errorIndices - optional set of 0-based operation indices that will throw (skips t1 call)
 */
export function mockThroughputTimings(opDurations: number[], durationWindow: number, errorIndices?: Set<number>): void {
  const hrtimeValues: [number, number][] = [];
  const baseMs = 1000; // arbitrary base time

  // Call 1: initial timestamp for deadline calculation (deadline = base + durationWindow)
  hrtimeValues.push(msToHrtime(baseMs));

  let currentMs = baseMs;
  for (let i = 0; i < opDurations.length; i++) {
    // Loop condition check: current time must be < deadline
    hrtimeValues.push(msToHrtime(currentMs));
    // t0: start timing
    hrtimeValues.push(msToHrtime(currentMs));

    if (errorIndices && errorIndices.has(i)) {
      // Error case: callback throws before t1, so no t1 call
      // Advance time by the op duration for realism
      currentMs += opDurations[i];
    } else {
      // Success case: t1 = end timing (current + opDuration)
      currentMs += opDurations[i];
      hrtimeValues.push(msToHrtime(currentMs));
    }
  }

  // Final loop condition check: past deadline to exit
  hrtimeValues.push(msToHrtime(baseMs + durationWindow + 1));

  let callIndex = 0;
  jest.spyOn(process, "hrtime").mockImplementation(() => {
    if (callIndex >= hrtimeValues.length) {
      return msToHrtime(baseMs + durationWindow + 1000);
    }
    return hrtimeValues[callIndex++];
  });
}
