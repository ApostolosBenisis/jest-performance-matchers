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
