function validateLogDiagnostics(logDiagnostics: string | undefined): void {
  if (logDiagnostics !== undefined && logDiagnostics !== 'INFO' && logDiagnostics !== 'WARN' && logDiagnostics !== 'FAIL') {
    throw new Error(`jest-performance-matchers: logDiagnostics must be 'INFO', 'WARN', or 'FAIL', received '${logDiagnostics}'`);
  }
}

function validateWarmup(warmup: number | undefined): void {
  if (warmup !== undefined && (!Number.isInteger(warmup) || warmup < 0)) {
    throw new Error(`jest-performance-matchers: warmup must be a non-negative integer, received ${warmup}`);
  }
}

function validateConfidence(confidence: number | undefined): void {
  if (confidence === undefined) return;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new Error(`jest-performance-matchers: confidence must be a number between 0 (exclusive) and 1 (exclusive), received ${confidence}`);
  }
}

function validateOutliers(outliers: string | undefined): void {
  if (outliers !== undefined && outliers !== 'remove' && outliers !== 'keep') {
    throw new Error(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${outliers}'`);
  }
}

function validateAllowedErrorRate(allowedErrorRate: number | undefined): void {
  if (allowedErrorRate === undefined) return;
  if (typeof allowedErrorRate !== 'number' || !Number.isFinite(allowedErrorRate) || allowedErrorRate < 0 || allowedErrorRate > 1) {
    throw new Error(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${allowedErrorRate}`);
  }
}

interface CommonTailOptions {
  outliers?: 'remove' | 'keep' | string;
  allowedErrorRate?: number;
  logDiagnostics?: string;
  setup?: unknown;
  teardown?: unknown;
  setupEach?: unknown;
  teardownEach?: unknown;
}

/** Shared validation tail used by every multi-iteration matcher's options. */
function validateCommonTail(options: CommonTailOptions): void {
  validateOutliers(options.outliers);
  validateAllowedErrorRate(options.allowedErrorRate);
  validateLogDiagnostics(options.logDiagnostics);
  validateSetupTeardown(options);
}

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
  allowedErrorRate?: number,
  logDiagnostics?: string,
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
  validateWarmup(options.warmup);
  validateCommonTail(options);
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
  logDiagnostics?: string,
}): void {
  if (!options || typeof options !== 'object') {
    throw new Error('jest-performance-matchers: options must be an object with iterations');
  }
  if (!Number.isInteger(options.iterations) || options.iterations < 2) {
    throw new Error(`jest-performance-matchers: iterations must be an integer >= 2 for comparative matchers (Welch's t-test requires n >= 2 per function), received ${options.iterations}`);
  }
  validateWarmup(options.warmup);
  validateConfidence(options.confidence);
  validateCommonTail(options);
}

export function validateExpectedOpsPerSecond(expectedOpsPerSecond: number): void {
  if (typeof expectedOpsPerSecond !== 'number' || !Number.isFinite(expectedOpsPerSecond) || expectedOpsPerSecond <= 0) {
    throw new Error(`jest-performance-matchers: expected ops/sec must be a positive number, received ${expectedOpsPerSecond}`);
  }
}

function validateDurationOptionsHeader(options: { duration?: unknown }): void {
  if (!options || typeof options !== 'object') {
    throw new Error('jest-performance-matchers: options must be an object with duration');
  }
  if (typeof options.duration !== 'number' || !Number.isFinite(options.duration) || options.duration <= 0) {
    throw new Error(`jest-performance-matchers: duration must be a positive number, received ${options.duration}`);
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
  logDiagnostics?: string,
}): void {
  validateDurationOptionsHeader(options);
  validateWarmup(options.warmup);
  validateCommonTail(options);
}

export function validateComparativeThroughputOptions(options: {
  duration: number,
  warmup?: number,
  confidence?: number,
  outliers?: 'remove' | 'keep',
  setup?: unknown,
  teardown?: unknown,
  setupEach?: unknown,
  teardownEach?: unknown,
  allowedErrorRate?: number,
  logDiagnostics?: string,
}): void {
  validateDurationOptionsHeader(options);
  validateWarmup(options.warmup);
  validateConfidence(options.confidence);
  validateCommonTail(options);
}
