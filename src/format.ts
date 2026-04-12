/**
 * Format a millisecond value with adaptive decimal places.
 *
 * - Zero displays as '0.00'
 * - Values with |value| >= 0.01 use 2 decimal places (matches legacy toFixed(2))
 * - Values with |value| < 0.01 use enough decimal places for 3 significant figures
 *
 * This prevents sub-millisecond timings from being truncated to '0.00ms'.
 */
export function formatMs(value: number): string {
  if (value === 0) return '0.00';
  const abs = Math.abs(value);
  if (abs >= 0.01) return value.toFixed(2);
  const decimals = Math.ceil(-Math.log10(abs)) + 2;
  // Strip trailing zeros: e.g. '0.00100' -> '0.001', but keep '0.00512' as-is
  const raw = value.toFixed(decimals);
  let end = raw.length;
  while (raw[end - 1] === '0') end--;
  return raw.slice(0, end);
}
