/**
 * Examples: toCompleteWithin / toResolveWithin
 *
 * Single-run matchers — assert that code completes within a time budget.
 * Best for smoke tests and coarse-grained guards.
 */
import '../src/main';

// --- Synchronous ---

test('array sort completes within 50ms', () => {
  // Prepare a dataset to sort
  const data = Array.from({length: 10_000}, () => Math.random());

  // Assert that sorting completes within the time budget
  expect(() => {
    data.sort((a, b) => a - b);
  }).toCompleteWithin(50);
});

test('JSON parse completes within 10ms', () => {
  // Prepare a JSON payload to parse
  const json = JSON.stringify({users: Array.from({length: 100}, (_, i) => ({id: i, name: `user-${i}`}))});

  // Assert that parsing completes within the time budget
  expect(() => {
    JSON.parse(json);
  }).toCompleteWithin(10);
});

test('heavy computation does NOT complete within 1ms', () => {
  // Assert that a CPU-intensive loop exceeds the 1ms budget
  expect(() => {
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) sum += Math.sqrt(i);
    return sum;
  }).not.toCompleteWithin(0.001);
});

// --- With setup/teardown ---

test('sorting pre-generated data completes within 20ms', () => {
  // Setup generates the data (not timed)
  const setup = () => Array.from({length: 5_000}, () => Math.random());

  // Assert that sorting the pre-generated data completes within the time budget
  expect((data: number[]) => {
    data.sort((a, b) => a - b);
  }).toCompleteWithin(20, {setup});
});

// --- Asynchronous ---

test('setTimeout(0) resolves within 50ms', async () => {
  // Assert that a minimal async delay resolves within the time budget
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  }).toResolveWithin(50);
});

test('async file-like operation resolves within 100ms', async () => {
  // Assert that a simulated I/O delay resolves within the time budget
  await expect(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
  }).toResolveWithin(100);
});
