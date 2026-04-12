export function validateCallback(callback: unknown): void {
  if (typeof callback !== 'function') {
    throw new TypeError(`jest-performance-matchers: expected value must be a function, received ${typeof callback}`);
  }
}

export function validateDuration(expectedDurationInMilliseconds: number): void {
  if (typeof expectedDurationInMilliseconds !== 'number' || !Number.isFinite(expectedDurationInMilliseconds) || expectedDurationInMilliseconds <= 0) {
    throw new Error(`jest-performance-matchers: expected duration must be a positive number, received ${expectedDurationInMilliseconds}`);
  }
}

export function validateSetupTeardown(options?: {
  setup?: unknown,
  teardown?: unknown,
  setupEach?: unknown,
  teardownEach?: unknown
}): void {
  if (options?.setup !== undefined && typeof options.setup !== 'function') {
    throw new Error(`jest-performance-matchers: setup must be a function if provided, received ${typeof options.setup}`);
  }
  if (options?.teardown !== undefined && typeof options.teardown !== 'function') {
    throw new Error(`jest-performance-matchers: teardown must be a function if provided, received ${typeof options.teardown}`);
  }
  if (options?.setupEach !== undefined && typeof options.setupEach !== 'function') {
    throw new Error(`jest-performance-matchers: setupEach must be a function if provided, received ${typeof options.setupEach}`);
  }
  if (options?.teardownEach !== undefined && typeof options.teardownEach !== 'function') {
    throw new Error(`jest-performance-matchers: teardownEach must be a function if provided, received ${typeof options.teardownEach}`);
  }
}

export function validateQuantileOptions(options: {
  iterations: number,
  quantile: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: unknown,
  teardown?: unknown,
  setupEach?: unknown,
  teardownEach?: unknown,
  allowedErrorRate?: number
}): void {
  if (!options || typeof options !== 'object') {
    throw new Error('jest-performance-matchers: options must be an object with iterations and quantile');
  }
  if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
    throw new Error(`jest-performance-matchers: iterations must be a positive integer, received ${options.iterations}`);
  }
  if (!Number.isInteger(options.quantile) || options.quantile < 1 || options.quantile > 100) {
    throw new Error(`jest-performance-matchers: quantile must be an integer between 1 and 100, received ${options.quantile}`);
  }
  if (options.warmup !== undefined && (!Number.isInteger(options.warmup) || options.warmup < 0)) {
    throw new Error(`jest-performance-matchers: warmup must be a non-negative integer, received ${options.warmup}`);
  }
  if (options.outliers !== undefined && options.outliers !== 'remove' && options.outliers !== 'keep') {
    throw new Error(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${options.outliers}'`);
  }
  if (options.allowedErrorRate !== undefined) {
    if (typeof options.allowedErrorRate !== 'number' || !Number.isFinite(options.allowedErrorRate) || options.allowedErrorRate < 0 || options.allowedErrorRate > 1) {
      throw new Error(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${options.allowedErrorRate}`);
    }
  }
  validateSetupTeardown(options);
}

export function validateComparativeOptions(options: {
  iterations: number,
  warmup?: number,
  confidence?: number,
  outliers?: 'remove' | 'keep',
  setup?: unknown,
  teardown?: unknown,
  setupEach?: unknown,
  teardownEach?: unknown,
  allowedErrorRate?: number,
}): void {
  if (!options || typeof options !== 'object') {
    throw new Error('jest-performance-matchers: options must be an object with iterations');
  }
  if (!Number.isInteger(options.iterations) || options.iterations < 2) {
    throw new Error(`jest-performance-matchers: iterations must be an integer >= 2 for comparative matchers (Welch's t-test requires n >= 2 per function), received ${options.iterations}`);
  }
  if (options.warmup !== undefined && (!Number.isInteger(options.warmup) || options.warmup < 0)) {
    throw new Error(`jest-performance-matchers: warmup must be a non-negative integer, received ${options.warmup}`);
  }
  if (options.confidence !== undefined) {
    if (typeof options.confidence !== 'number' || !Number.isFinite(options.confidence) || options.confidence <= 0 || options.confidence >= 1) {
      throw new Error(`jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received ${options.confidence}`);
    }
  }
  if (options.outliers !== undefined && options.outliers !== 'remove' && options.outliers !== 'keep') {
    throw new Error(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${options.outliers}'`);
  }
  if (options.allowedErrorRate !== undefined) {
    if (typeof options.allowedErrorRate !== 'number' || !Number.isFinite(options.allowedErrorRate) || options.allowedErrorRate < 0 || options.allowedErrorRate > 1) {
      throw new Error(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${options.allowedErrorRate}`);
    }
  }
  validateSetupTeardown(options);
}

export function validateExpectedOpsPerSecond(expectedOpsPerSecond: number): void {
  if (typeof expectedOpsPerSecond !== 'number' || !Number.isFinite(expectedOpsPerSecond) || expectedOpsPerSecond <= 0) {
    throw new Error(`jest-performance-matchers: expected ops/sec must be a positive number, received ${expectedOpsPerSecond}`);
  }
}

export function validateThroughputOptions(options: {
  duration: number,
  warmup?: number,
  outliers?: 'remove' | 'keep',
  setup?: unknown,
  teardown?: unknown,
  setupEach?: unknown,
  teardownEach?: unknown,
  allowedErrorRate?: number,
}): void {
  if (!options || typeof options !== 'object') {
    throw new Error('jest-performance-matchers: options must be an object with duration');
  }
  if (typeof options.duration !== 'number' || !Number.isFinite(options.duration) || options.duration <= 0) {
    throw new Error(`jest-performance-matchers: duration must be a positive number, received ${options.duration}`);
  }
  if (options.warmup !== undefined && (!Number.isInteger(options.warmup) || options.warmup < 0)) {
    throw new Error(`jest-performance-matchers: warmup must be a non-negative integer, received ${options.warmup}`);
  }
  if (options.outliers !== undefined && options.outliers !== 'remove' && options.outliers !== 'keep') {
    throw new Error(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${options.outliers}'`);
  }
  if (options.allowedErrorRate !== undefined) {
    if (typeof options.allowedErrorRate !== 'number' || !Number.isFinite(options.allowedErrorRate) || options.allowedErrorRate < 0 || options.allowedErrorRate > 1) {
      throw new Error(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${options.allowedErrorRate}`);
    }
  }
  validateSetupTeardown(options);
}
