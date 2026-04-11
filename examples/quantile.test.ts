/**
 * Examples: toCompleteWithinQuantile / toResolveWithinQuantile
 *
 * Multi-iteration matchers — assert that code completes within a time budget
 * at a given percentile across many runs. This is the workhorse for CI
 * performance gates.
 */
import '../src/main';

// --- Basic quantile assertions ---

test('array sort P95 under 20ms across 50 runs', () => {
  const data = Array.from({length: 10_000}, () => Math.random());

  expect(() => {
    [...data].sort((a, b) => a - b);
  }).toCompleteWithinQuantile(20, {iterations: 50, quantile: 95});
});

test('JSON parse P90 under 5ms across 100 runs', () => {
  const json = JSON.stringify({items: Array.from({length: 200}, (_, i) => ({id: i}))});

  expect(() => {
    JSON.parse(json);
  }).toCompleteWithinQuantile(5, {iterations: 100, quantile: 90});
});

// --- With warmup ---

test('regex match P95 under 10ms with warmup for JIT compilation', () => {
  const pattern = /(\w+\.)+\w+@(\w+\.)+\w+/;
  const input = 'user.name@example.com';

  expect(() => {
    pattern.test(input);
  }).toCompleteWithinQuantile(10, {iterations: 100, quantile: 95, warmup: 5});
});

// --- With outlier removal ---

test('map/reduce P95 under 15ms with outlier removal for GC pauses', () => {
  const data = Array.from({length: 5_000}, (_, i) => i);

  expect(() => {
    data.map(x => x * 2).reduce((sum, x) => sum + x, 0);
  }).toCompleteWithinQuantile(15, {iterations: 100, quantile: 95, outliers: 'remove'});
});

// --- With setup/teardown ---

test('sorting fresh data each iteration, P95 under 30ms', () => {
  expect((_suiteState: unknown, data: unknown) => {
    (data as number[]).sort((a, b) => a - b);
  }).toCompleteWithinQuantile(30, {
    iterations: 50,
    quantile: 95,
    warmup: 3,
    // setupEach provides a fresh unsorted copy for each iteration
    setupEach: () => Array.from({length: 10_000}, () => Math.random()),
  });
});

// --- With error tolerance ---

test('flaky operation P95 under 50ms, tolerating 5% failures', () => {
  let callCount = 0;

  expect(() => {
    callCount++;
    // Simulate a 3% failure rate
    if (callCount % 33 === 0) throw new Error('transient failure');
    const data = Array.from({length: 1_000}, () => Math.random());
    data.sort((a, b) => a - b);
  }).toCompleteWithinQuantile(50, {
    iterations: 100,
    quantile: 95,
    allowedErrorRate: 0.05,
  });
});

// --- Asynchronous ---

test('async operation P90 under 100ms across 30 runs', async () => {
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
  }).toResolveWithinQuantile(100, {iterations: 30, quantile: 90, warmup: 3});
});
