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
  // setupEach provides a fresh unsorted array for each iteration (not timed)
  const setupEach = () => Array.from({length: 1_000}, () => Math.random());

  // Function A: native Array.sort on fresh data
  const nativeSort = (_suite: unknown, iterData: unknown) => {
    const arr = iterData as number[];
    arr.sort((a, b) => a - b);
  };

  // Function B: naive bubble sort on fresh data (intentionally slow)
  const bubbleSort = (_suite: unknown, iterData: unknown) => {
    const arr = iterData as number[];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  };

  // Assert that native sort is statistically faster over 30 iterations
  expect(nativeSort).toBeFasterThan(bubbleSort, {iterations: 30, warmup: 3, setupEach});
});

// --- With outlier removal ---

test('Map lookup is faster than array find (with outlier removal)', () => {
  // Prepare a Map and an equivalent array for lookup comparison
  const size = 10_000;
  const keys = Array.from({length: size}, (_, i) => `key-${i}`);
  const map = new Map(keys.map((k, i) => [k, i]));
  const arr = keys.map((k, i) => ({key: k, value: i}));
  const target = keys[size - 1];

  // Function A: Map.get (O(1) average)
  const mapLookup = () => {
    map.get(target);
  };

  // Function B: Array.find (O(n) worst case)
  const arrayFind = () => {
    arr.find(item => item.key === target);
  };

  // Assert with outlier removal to filter GC spikes
  expect(mapLookup).toBeFasterThan(arrayFind, {iterations: 50, warmup: 5, outliers: 'remove'});
});

// --- With custom confidence ---

test('string concatenation vs template literal (99% confidence)', () => {
  // Prepare an array of strings to join
  const parts = Array.from({length: 100}, (_, i) => `part-${i}`);

  // Function A: Array.join
  const joinMethod = () => {
    parts.join('');
  };

  // Function B: manual string concatenation
  const concatMethod = () => {
    let result = '';
    for (const p of parts) result += p;
    return result;
  };

  // Assert at a stricter 99% confidence level
  expect(joinMethod).toBeFasterThan(concatMethod, {iterations: 100, confidence: 0.99, outliers: 'remove'});
});

// --- With setupEach for fresh data each iteration ---

test('Set.has is faster than Array.includes with fresh data each iteration', () => {
  // Prepare shared data structures
  const arr = Array.from({length: 10_000}, (_, i) => i);
  const set = new Set(arr);

  // Function A: Set.has (O(1) average)
  const setLookup = () => {
    set.has(arr[arr.length - 1]);
  };

  // Function B: Array.includes (O(n) worst case)
  const arrayIncludes = () => {
    arr.includes(arr[arr.length - 1]);
  };

  // Assert that Set.has is statistically faster
  expect(setLookup).toBeFasterThan(arrayIncludes, {iterations: 50, warmup: 5});
});

// --- Negation: proving two functions have similar performance ---

test('two identical implementations are NOT significantly different', () => {
  // Prepare shared dataset
  const data = Array.from({length: 1_000}, () => Math.random());

  // Both functions perform the same operation
  const implA = () => {
    data.reduce((sum, x) => sum + x, 0);
  };

  const implB = () => {
    data.reduce((sum, x) => sum + x, 0);
  };

  // Assert that there is no significant speed difference
  expect(implA).not.toBeFasterThan(implB, {iterations: 30});
});

// --- Asynchronous comparison ---

test('cached promise is faster than uncached', async () => {
  const cache = new Map<string, number>();

  // Function A: cached lookup (instant)
  const cachedLookup = async () => {
    if (!cache.has('key')) cache.set('key', 42);
    return cache.get('key');
  };

  // Function B: uncached async operation (simulates slow I/O)
  const uncachedLookup = async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
    return 42;
  };

  // Assert that the cached path is statistically faster
  await expect(cachedLookup).toResolveFasterThan(uncachedLookup, {iterations: 20, warmup: 3});
});

// --- With error tolerance ---

test('stable function is faster than flaky function (tolerating 10% errors)', () => {
  let flakyCount = 0;

  // Function A: stable, small sort
  const stableSort = () => {
    const data = Array.from({length: 100}, () => Math.random());
    data.sort((a, b) => a - b);
  };

  // Function B: flaky, larger sort that occasionally throws
  const flakySort = () => {
    flakyCount++;
    if (flakyCount % 10 === 0) throw new Error('transient failure');
    const data = Array.from({length: 500}, () => Math.random());
    data.sort((a, b) => a - b);
  };

  // Assert while tolerating up to 15% errors from the flaky function
  expect(stableSort).toBeFasterThan(flakySort, {iterations: 50, allowedErrorRate: 0.15});
});
