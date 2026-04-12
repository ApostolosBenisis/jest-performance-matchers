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
  // Prepare a dataset to sort (copied each iteration to avoid in-place mutation bias)
  const data = Array.from({length: 10_000}, () => Math.random());

  // Assert that 95% of 50 runs complete within 20ms
  expect(() => {
    [...data].sort((a, b) => a - b);
  }).toCompleteWithinQuantile(20, {iterations: 50, quantile: 95});
});

test('JSON parse P90 under 5ms across 100 runs', () => {
  // Prepare a JSON payload to parse
  const json = JSON.stringify({items: Array.from({length: 200}, (_, i) => ({id: i}))});

  // Assert that 90% of 100 runs complete within 5ms
  expect(() => {
    JSON.parse(json);
  }).toCompleteWithinQuantile(5, {iterations: 100, quantile: 90});
});

// --- With warmup ---

test('regex match P95 under 10ms with warmup for JIT compilation', () => {
  // Prepare the regex pattern and test input
  const pattern = /(\w+\.)+\w+@(\w+\.)+\w+/;
  const input = 'user.name@example.com';

  // Assert P95 with 5 warmup iterations to stabilize JIT
  expect(() => {
    pattern.test(input);
  }).toCompleteWithinQuantile(10, {iterations: 100, quantile: 95, warmup: 5});
});

// --- With outlier removal ---

test('map/reduce P95 under 15ms with outlier removal for GC pauses', () => {
  // Prepare the dataset
  const data = Array.from({length: 5_000}, (_, i) => i);

  // Assert P95 with Tukey IQR outlier removal to filter GC spikes
  expect(() => {
    data.map(x => x * 2).reduce((sum, x) => sum + x, 0);
  }).toCompleteWithinQuantile(15, {iterations: 100, quantile: 95, outliers: 'remove'});
});

// --- With setup/teardown ---

test('sorting fresh data each iteration, P95 under 30ms', () => {
  // setupEach provides a fresh unsorted array for each iteration (not timed)
  const setupEach = () => Array.from({length: 10_000}, () => Math.random());

  // Assert P95 when sorting fresh data each time
  expect((_suiteState: unknown, data: unknown) => {
    (data as number[]).sort((a, b) => a - b);
  }).toCompleteWithinQuantile(30, {
    iterations: 50,
    quantile: 95,
    warmup: 3,
    setupEach,
  });
});

// --- With error tolerance ---

test('flaky operation P95 under 50ms, tolerating 5% failures', () => {
  let callCount = 0;

  // Assert P95 while tolerating up to 5% transient failures
  expect(() => {
    callCount++;
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
  // Assert that an async delay meets P90 within the time budget
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
  }).toResolveWithinQuantile(100, {iterations: 30, quantile: 90, warmup: 3});
});
