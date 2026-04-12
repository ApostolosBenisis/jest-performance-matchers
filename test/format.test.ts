import {formatMs} from '../src/format';

describe('formatMs', () => {
  test('returns "0.00" for zero', () => {
    expect(formatMs(0)).toBe('0.00');
  });

  test('uses 2 decimal places for values >= 0.01', () => {
    expect(formatMs(5)).toBe('5.00');
    expect(formatMs(0.01)).toBe('0.01');
    expect(formatMs(0.99)).toBe('0.99');
    expect(formatMs(123.456)).toBe('123.46');
    expect(formatMs(1.005)).toBe('1.00'); // JS floating-point: (1.005).toFixed(2) === '1.00'
  });

  test('uses 2 decimal places for negative values with abs >= 0.01', () => {
    expect(formatMs(-5)).toBe('-5.00');
    expect(formatMs(-0.01)).toBe('-0.01');
    expect(formatMs(-123.456)).toBe('-123.46');
  });

  test('uses adaptive decimals for values < 0.01 without trailing zeros', () => {
    expect(formatMs(0.00512)).toBe('0.00512');
    expect(formatMs(0.001)).toBe('0.001');
    expect(formatMs(0.0001)).toBe('0.0001');
    expect(formatMs(0.009)).toBe('0.009');
    expect(formatMs(0.00999)).toBe('0.00999');
  });

  test('uses adaptive decimals for negative sub-millisecond values', () => {
    expect(formatMs(-0.00512)).toBe('-0.00512');
    expect(formatMs(-0.001)).toBe('-0.001');
    expect(formatMs(-0.0001)).toBe('-0.0001');
  });
});
