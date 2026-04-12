/**
 * Examples: toAchieveOpsPerSecond / toResolveAtOpsPerSecond
 *
 * Throughput matchers — assert that a function sustains at least N ops/sec
 * over a time-bounded measurement window. Unlike iteration-based matchers,
 * you specify a duration and the matcher runs as many operations as it can.
 */
import '../src/main';

// --- Basic throughput assertion ---

test('JSON.parse sustains at least 50,000 ops/sec', () => {
  // Prepare a JSON payload to parse
  const json = JSON.stringify({items: Array.from({length: 50}, (_, i) => ({id: i}))});

  // Assert that parsing sustains the target throughput over 1 second
  expect(() => {
    JSON.parse(json);
  }).toAchieveOpsPerSecond(50000, {duration: 1000});
});

// --- With warmup ---

test('array sort sustains at least 5,000 ops/sec after warmup', () => {
  // Prepare a dataset to sort (copied each operation to avoid mutation bias)
  const data = Array.from({length: 1_000}, () => Math.random());

  // Assert throughput with 100 warmup iterations to stabilize JIT
  expect(() => {
    [...data].sort((a, b) => a - b);
  }).toAchieveOpsPerSecond(5000, {duration: 1000, warmup: 100});
});

// --- With outlier removal ---

test('Map.get sustains high throughput with outlier removal', () => {
  // Prepare a large Map for lookup
  const size = 10_000;
  const keys = Array.from({length: size}, (_, i) => `key-${i}`);
  const map = new Map(keys.map((k, i) => [k, i]));

  // Assert throughput with Tukey IQR outlier removal to filter GC spikes
  expect(() => {
    map.get(keys[size - 1]);
  }).toAchieveOpsPerSecond(100000, {duration: 1000, warmup: 50, outliers: 'remove'});
});

// --- With setupEach for fresh data each operation ---

test('sorting fresh arrays at high throughput', () => {
  // setupEach provides a fresh unsorted array before each operation (not timed)
  const setupEach = () => Array.from({length: 1_000}, () => Math.random());

  // Assert throughput when sorting fresh data every operation
  expect((_suiteState: unknown, data: unknown) => {
    (data as number[]).sort((a, b) => a - b);
  }).toAchieveOpsPerSecond(1000, {
    duration: 1000,
    warmup: 20,
    setupEach,
  });
});

// --- Negation: proving a function does NOT sustain unrealistic throughput ---

test('heavy computation does NOT sustain 1,000,000 ops/sec', () => {
  // Assert that a CPU-intensive sort cannot sustain an unrealistic target
  expect(() => {
    const data = Array.from({length: 1_000}, () => Math.random());
    data.sort((a, b) => a - b);
  }).not.toAchieveOpsPerSecond(1000000, {duration: 500});
});

// --- With error tolerance ---

test('flaky function sustains throughput despite occasional errors', () => {
  let callCount = 0;

  // Assert throughput while tolerating up to 10% transient failures
  expect(() => {
    callCount++;
    if (callCount % 20 === 0) throw new Error('transient failure');

    const data = Array.from({length: 100}, () => Math.random());
    data.sort((a, b) => a - b);
  }).toAchieveOpsPerSecond(1000, {duration: 1000, allowedErrorRate: 0.10});
});

// --- Asynchronous throughput ---

test('async operation sustains at least 100 ops/sec', async () => {
  // Assert that an async delay-based operation sustains the target throughput
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
  }).toResolveAtOpsPerSecond(100, {duration: 1000, warmup: 10});
});

// --- With setup/teardown ---

test('throughput with suite-level setup and per-op setup', () => {
  // setup runs once before measurement begins (not timed)
  const setup = () => ({initialized: true});

  // setupEach provides fresh data before each operation (not timed)
  const setupEach = () => Array.from({length: 100}, () => Math.random());

  // teardown runs once after measurement completes
  const teardown = () => { /* cleanup resources */ };

  // Assert throughput with both suite-level and per-operation lifecycle hooks
  expect((_suiteState: unknown, batch: unknown) => {
    (batch as number[]).reduce((sum, x) => sum + x, 0);
  }).toAchieveOpsPerSecond(10000, {
    duration: 1000,
    warmup: 50,
    setup,
    setupEach,
    teardown,
  });
});
