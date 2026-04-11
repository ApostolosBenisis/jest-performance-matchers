/**
 * Examples: toCompleteWithin / toResolveWithin
 *
 * Single-run matchers — assert that code completes within a time budget.
 * Best for smoke tests and coarse-grained guards.
 */
import '../src/main';

// --- Synchronous ---

test('array sort completes within 50ms', () => {
  expect(() => {
    const data = Array.from({length: 10_000}, () => Math.random());
    data.sort((a, b) => a - b);
  }).toCompleteWithin(50);
});

test('JSON parse completes within 10ms', () => {
  const json = JSON.stringify({users: Array.from({length: 100}, (_, i) => ({id: i, name: `user-${i}`}))});

  expect(() => {
    JSON.parse(json);
  }).toCompleteWithin(10);
});

test('heavy computation does NOT complete within 1ms', () => {
  expect(() => {
    // Intentionally slow — summing a large array
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) sum += Math.sqrt(i);
    return sum;
  }).not.toCompleteWithin(0.001);
});

// --- With setup/teardown ---

test('sorting pre-generated data completes within 20ms', () => {
  expect((data: number[]) => {
    data.sort((a, b) => a - b);
  }).toCompleteWithin(20, {
    // Setup generates the data (not timed); teardown is optional
    setup: () => Array.from({length: 5_000}, () => Math.random()),
  });
});

// --- Asynchronous ---

test('setTimeout(0) resolves within 50ms', async () => {
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  }).toResolveWithin(50);
});

test('async file-like operation resolves within 100ms', async () => {
  await expect(async () => {
    // Simulates an async I/O operation
    await new Promise(resolve => setTimeout(resolve, 5));
  }).toResolveWithin(100);
});
