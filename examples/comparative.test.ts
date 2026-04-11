/**
 * Examples: toBeFasterThan / toResolveFasterThan
 *
 * Comparative matchers — statistically prove that one function is faster
 * than another using Welch's t-test. Both functions run N iterations
 * (interleaved), and the results are compared for significance.
 */
import '../src/main';

// --- Basic comparison ---

test('native sort is faster than manual bubble sort', () => {
  const data = Array.from({length: 1_000}, () => Math.random());

  expect(() => {
    [...data].sort((a, b) => a - b);
  }).toBeFasterThan(() => {
    // Naive bubble sort — intentionally slow
    const arr = [...data];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }, {iterations: 30, warmup: 3});
});

// --- With outlier removal ---

test('Map lookup is faster than array find (with outlier removal)', () => {
  const size = 10_000;
  const keys = Array.from({length: size}, (_, i) => `key-${i}`);
  const map = new Map(keys.map((k, i) => [k, i]));
  const arr = keys.map((k, i) => ({key: k, value: i}));
  const target = keys[size - 1];

  expect(() => {
    map.get(target);
  }).toBeFasterThan(() => {
    arr.find(item => item.key === target);
  }, {iterations: 50, warmup: 5, outliers: 'remove'});
});

// --- With custom confidence ---

test('string concatenation vs template literal (99% confidence)', () => {
  const parts = Array.from({length: 100}, (_, i) => `part-${i}`);

  expect(() => {
    parts.join('');
  }).toBeFasterThan(() => {
    let result = '';
    for (const p of parts) result += p;
    return result;
  }, {iterations: 100, confidence: 0.99});
});

// --- With setupEach for fresh data each iteration ---

test('Set.has is faster than Array.includes with fresh data each iteration', () => {
  const arr = Array.from({length: 10_000}, (_, i) => i);
  const set = new Set(arr);

  expect(() => {
    set.has(arr[arr.length - 1]);
  }).toBeFasterThan(() => {
    arr.includes(arr[arr.length - 1]);
  }, {iterations: 50, warmup: 5});
});

// --- Negation: proving two functions have similar performance ---

test('two identical implementations are NOT significantly different', () => {
  const data = Array.from({length: 1_000}, () => Math.random());

  // Same operation — there should be no significant difference
  expect(() => {
    data.reduce((sum, x) => sum + x, 0);
  }).not.toBeFasterThan(() => {
    data.reduce((sum, x) => sum + x, 0);
  }, {iterations: 30});
});

// --- Asynchronous comparison ---

test('cached promise is faster than uncached', async () => {
  const cache = new Map<string, number>();

  await expect(async () => {
    // Cached — instant lookup
    if (!cache.has('key')) cache.set('key', 42);
    return cache.get('key');
  }).toResolveFasterThan(async () => {
    // Uncached — simulates a slow async operation
    await new Promise(resolve => setTimeout(resolve, 1));
    return 42;
  }, {iterations: 20, warmup: 3});
});

// --- With error tolerance ---

test('stable function is faster than flaky function (tolerating 10% errors)', () => {
  let flakyCount = 0;

  expect(() => {
    const data = Array.from({length: 100}, () => Math.random());
    data.sort((a, b) => a - b);
  }).toBeFasterThan(() => {
    flakyCount++;
    if (flakyCount % 10 === 0) throw new Error('transient failure');
    const data = Array.from({length: 500}, () => Math.random());
    data.sort((a, b) => a - b);
  }, {iterations: 50, allowedErrorRate: 0.15});
});
