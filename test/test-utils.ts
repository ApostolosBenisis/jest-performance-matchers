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
