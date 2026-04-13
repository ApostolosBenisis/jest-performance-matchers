/**
 * Examples: toHaveHigherThroughputThan / toResolveWithHigherThroughputThan
 *
 * Comparative throughput matchers — statistically prove that one function
 * sustains higher throughput (ops/sec) than another using Welch's t-test on
 * per-operation durations. Each function runs independently for the specified
 * `duration` window; faster functions complete more ops (unequal sample
 * sizes are handled natively by Welch's t-test).
 */
import '../src/main';

// --- Basic comparison ---

test('Map.get has higher throughput than Array.find', () => {
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

  // Assert that Map.get has statistically higher throughput over a 500ms window
  expect(mapLookup).toHaveHigherThroughputThan(arrayFind, {duration: 500, warmup: 50});
});

// --- With outlier removal ---

test('Set.has has higher throughput than Array.includes (with outlier removal)', () => {
  // Prepare shared string-keyed data structures (strings prevent JIT integer optimizations)
  const size = 50_000;
  const arr = Array.from({length: size}, (_, i) => `key-${i}`);
  const set = new Set(arr);
  const target = arr[size - 1]; // worst-case for Array.includes (full scan)

  // Function A: Set.has (O(1) average)
  const setLookup = () => {
    set.has(target);
  };

  // Function B: Array.includes (O(n) — has to scan all 50,000 entries)
  const arrayIncludes = () => {
    arr.includes(target);
  };

  // Assert with outlier removal to filter GC pauses from per-op timing stats
  expect(setLookup).toHaveHigherThroughputThan(arrayIncludes, {
    duration: 500, warmup: 20, outliers: 'remove',
  });
});

// --- With custom confidence ---

test('hashing a short string has higher throughput than hashing a long one (99% confidence)', () => {
  // Prepare short and long inputs with the same hashing algorithm
  const shortInput = 'abc';
  const longInput = 'a'.repeat(1_000);

  // Function A: hash short string (small loop)
  const hashShort = () => {
    let h = 0;
    for (let i = 0; i < shortInput.length; i++) h = (h * 31 + shortInput.charCodeAt(i)) | 0;
    return h;
  };

  // Function B: hash long string (reliably ~300x more work per op)
  const hashLong = () => {
    let h = 0;
    for (let i = 0; i < longInput.length; i++) h = (h * 31 + longInput.charCodeAt(i)) | 0;
    return h;
  };

  // Assert at a stricter 99% confidence level — huge throughput gap makes this robust
  expect(hashShort).toHaveHigherThroughputThan(hashLong, {
    duration: 500, warmup: 50, confidence: 0.99, outliers: 'remove'
  });
});

// --- With setupEach for fresh data each operation ---

test('native sort has higher throughput than bubble sort with fresh arrays each op', () => {
  // setupEach provides a fresh unsorted array for each operation (not timed)
  const setupEach = () => Array.from({length: 200}, () => Math.random());

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

  // Assert that native sort has statistically higher throughput
  expect(nativeSort).toHaveHigherThroughputThan(bubbleSort, {
    duration: 500, warmup: 5, setupEach,
  });
});

// --- Negation: proving a slower implementation does NOT have higher throughput ---

test('linear array scan does NOT have higher throughput than Map.get', () => {
  // Prepare equivalent Map and array lookups
  const size = 5_000;
  const keys = Array.from({length: size}, (_, i) => `key-${i}`);
  const map = new Map(keys.map((k, i) => [k, i]));
  const arr = keys.map((k, i) => ({key: k, value: i}));
  const target = keys[size - 1]; // worst-case for array scan

  // Function A: array scan (O(n) — expected to be slower)
  const arrayScan = () => {
    arr.find(item => item.key === target);
  };

  // Function B: Map.get (O(1) average — expected to be faster)
  const mapGet = () => {
    map.get(target);
  };

  // Assert A is NOT higher-throughput than B (guards against regressions in Map usage)
  expect(arrayScan).not.toHaveHigherThroughputThan(mapGet, {duration: 300});
});

// --- Asynchronous comparison ---

test('cached async lookup has higher throughput than uncached', async () => {
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

  // Assert that the cached path has statistically higher throughput
  await expect(cachedLookup).toResolveWithHigherThroughputThan(uncachedLookup, {
    duration: 500, warmup: 10,
  });
});

// --- With error tolerance ---

test('stable function has higher throughput than flaky function (tolerating 15% errors)', () => {
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
  expect(stableSort).toHaveHigherThroughputThan(flakySort, {
    duration: 500, allowedErrorRate: 0.15,
  });
});

// --- With suite-level setup/teardown and per-op hooks ---

test('throughput comparison with suite setup and per-op fresh state', () => {
  // setup runs once before both measurement windows (not timed)
  const setup = () => ({pool: 'shared-resource', items: 500});

  // setupEach provides a fresh shuffled array for each operation (not timed)
  const setupEach = (suite: unknown) => {
    const {items} = suite as {items: number};
    return Array.from({length: items}, () => Math.random());
  };

  // teardown runs once after both windows complete
  const teardown = () => { /* release shared resource */ };

  // Function A: single-pass max (O(n))
  const linearMax = (_suite: unknown, data: unknown) => {
    const arr = data as number[];
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) max = arr[i];
    }
    return max;
  };

  // Function B: sort-then-pick (O(n log n)) — genuinely more work
  const sortMax = (_suite: unknown, data: unknown) => {
    const arr = data as number[];
    arr.sort((a, b) => a - b);
    return arr[arr.length - 1];
  };

  // Assert throughput comparison with lifecycle hooks
  expect(linearMax).toHaveHigherThroughputThan(sortMax, {
    duration: 500, warmup: 20, setup, setupEach, teardown,
  });
});
