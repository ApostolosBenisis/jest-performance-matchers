import '../src/main';

describe("Input validation", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("toCompleteWithin", () => {
    test("should throw when received value is not a function", () => {
      // GIVEN a non-function value
      const givenValue = "foo-not-a-function";

      // WHEN asserting toCompleteWithin
      // THEN expect a descriptive error
      expect(() => {
        (expect(givenValue as unknown) as unknown as jest.Matchers<void>).toCompleteWithin(10);
      }).toThrowError(`jest-performance-matchers: expected value must be a function, received ${typeof givenValue}`);
    });

    test("should throw when duration is negative", () => {
      // GIVEN a negative duration
      const givenDuration = -5;

      // WHEN asserting toCompleteWithin with negative duration,
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithin(givenDuration);
      }).toThrowError(`jest-performance-matchers: expected duration must be a positive number, received ${givenDuration}`);
    });

    test("should throw when duration is zero", () => {
      // GIVEN a zero duration
      const givenDuration = 0;

      // WHEN asserting toCompleteWithin with zero duration,
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithin(givenDuration);
      }).toThrowError(`jest-performance-matchers: expected duration must be a positive number, received ${givenDuration}`);
    });

    test("should throw when duration is NaN", () => {
      // GIVEN NaN as duration
      const givenDuration = NaN;

      // WHEN asserting toCompleteWithin
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithin(givenDuration);
      }).toThrowError(`jest-performance-matchers: expected duration must be a positive number, received ${givenDuration}`);
    });

    test("should throw when duration is Infinity", () => {
      // GIVEN Infinity as duration
      const givenDuration = Infinity;

      // WHEN asserting toCompleteWithin
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithin(givenDuration);
      }).toThrowError(`jest-performance-matchers: expected duration must be a positive number, received ${givenDuration}`);
    });
  });

  describe("toResolveWithin", () => {
    test("should throw when received value is not a function", async () => {
      // GIVEN a non-function value
      const givenValue = 42;

      // WHEN asserting toResolveWithin
      // THEN expect a descriptive error
      await expect(async () => {
        await (expect(givenValue as unknown) as unknown as jest.Matchers<Promise<void>>).toResolveWithin(10);
      }).rejects.toThrowError(`jest-performance-matchers: expected value must be a function, received ${typeof givenValue}`);
    });

    test("should throw when duration is negative", async () => {
      // GIVEN a negative duration
      const givenDuration = -5;

      // WHEN asserting toResolveWithin with negative duration
      // THEN expect a descriptive error
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithin(givenDuration);
      }).rejects.toThrowError(`jest-performance-matchers: expected duration must be a positive number, received ${givenDuration}`);
    });
  });

  describe("toCompleteWithinQuantile", () => {
    test("should throw when received value is not a function", () => {
      // GIVEN a non-function value
      const givenValue = null;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        (expect(givenValue as unknown) as unknown as jest.Matchers<void>).toCompleteWithinQuantile(10, {
          iterations: 5,
          quantile: 95
        });
      }).toThrowError(`jest-performance-matchers: expected value must be a function, received ${typeof givenValue}`);
    });

    test("should throw when options is not provided", () => {
      // GIVEN no options
      // WHEN asserting toCompleteWithinQuantile without options
      // THEN expect a descriptive error
      expect(() => {
        (expect(() => undefined) as unknown as jest.Matchers<void>).toCompleteWithinQuantile(10, undefined as unknown as {
          iterations: number,
          quantile: number
        });
      }).toThrowError("jest-performance-matchers: options must be an object with iterations and quantile");
    });

    test("should throw when iterations is not a positive integer", () => {
      // GIVEN zero iterations
      const givenIterations = 0;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: givenIterations, quantile: 95});
      }).toThrowError(`jest-performance-matchers: iterations must be a positive integer, received ${givenIterations}`);
    });

    test("should throw when iterations is a float", () => {
      // GIVEN float iterations
      const givenIterations = 1.5;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: givenIterations, quantile: 95});
      }).toThrowError(`jest-performance-matchers: iterations must be a positive integer, received ${givenIterations}`);
    });

    test("should throw when quantile is out of range", () => {
      // GIVEN quantile > 100
      const givenQuantile = 101;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: givenQuantile});
      }).toThrowError(`jest-performance-matchers: quantile must be an integer between 1 and 100, received ${givenQuantile}`);
    });

    test("should throw when quantile is zero", () => {
      // GIVEN quantile = 0
      const givenQuantile = 0;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: givenQuantile});
      }).toThrowError(`jest-performance-matchers: quantile must be an integer between 1 and 100, received ${givenQuantile}`);
    });

    test("should throw when warmup is negative", () => {
      // GIVEN negative warmup
      const givenWarmup = -1;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, warmup: givenWarmup});
      }).toThrowError(`jest-performance-matchers: warmup must be a non-negative integer, received ${givenWarmup}`);
    });

    test("should throw when warmup is a float", () => {
      // GIVEN float warmup
      const givenWarmup = 1.5;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, warmup: givenWarmup});
      }).toThrowError(`jest-performance-matchers: warmup must be a non-negative integer, received ${givenWarmup}`);
    });

    test("should throw when outliers option is invalid", () => {
      // GIVEN invalid outliers option
      const givenOutliers = 'foo-invalid' as 'remove' | 'keep';

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, outliers: givenOutliers});
      }).toThrowError(`jest-performance-matchers: outliers must be 'remove' or 'keep', received '${givenOutliers}'`);
    });

    test("should throw when setup is not a function", () => {
      // GIVEN a non-function setup
      const givenSetup = "foo-not-a-function";

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        // @ts-expect-error - intentionally passing invalid setup for testing
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, setup: givenSetup});
      }).toThrowError(`jest-performance-matchers: setup must be a function if provided, received ${typeof givenSetup}`);
    });

    test("should throw when setup is null", () => {
      // GIVEN null as setup
      const givenSetup = null;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        // @ts-expect-error - intentionally passing invalid setup for testing
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, setup: givenSetup});
      }).toThrowError(`jest-performance-matchers: setup must be a function if provided, received ${typeof givenSetup}`);
    });

    test("should throw when teardown is not a function", () => {
      // GIVEN a non-function teardown
      const givenTeardown = 42;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        // @ts-expect-error - intentionally passing invalid teardown for testing
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, teardown: givenTeardown});
      }).toThrowError(`jest-performance-matchers: teardown must be a function if provided, received ${typeof givenTeardown}`);
    });

    test("should throw when teardown is null", () => {
      // GIVEN null as teardown
      const givenTeardown = null;

      // WHEN asserting toCompleteWithinQuantile
      // THEN expect a descriptive error
      expect(() => {
        // @ts-expect-error - intentionally passing invalid teardown for testing
        expect(() => undefined).toCompleteWithinQuantile(10, {iterations: 5, quantile: 95, teardown: givenTeardown});
      }).toThrowError(`jest-performance-matchers: teardown must be a function if provided, received ${typeof givenTeardown}`);
    });

    test("should throw a validation error when allowedErrorRate is negative", () => {
      // GIVEN a negative allowedErrorRate
      const givenAllowedErrorRate = -0.1;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate exceeds 1", () => {
      // GIVEN an allowedErrorRate above the maximum
      const givenAllowedErrorRate = 1.1;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate is NaN", () => {
      // GIVEN NaN as allowedErrorRate
      const givenAllowedErrorRate = NaN;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate is Infinity", () => {
      // GIVEN Infinity as allowedErrorRate
      const givenAllowedErrorRate = Infinity;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      expect(() => {
        expect(() => undefined).toCompleteWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });
  });

  describe("toResolveWithinQuantile", () => {
    test("should throw when received value is not a function", async () => {
      // GIVEN a non-function value
      const givenValue = true;

      // WHEN asserting toResolveWithinQuantile
      // THEN expect a descriptive error
      await expect(async () => {
        await (expect(givenValue as unknown) as unknown as jest.Matchers<Promise<void>>).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95
        });
      }).rejects.toThrowError(`jest-performance-matchers: expected value must be a function, received ${typeof givenValue}`);
    });

    test("should throw when iterations is negative", async () => {
      // GIVEN negative iterations
      const givenIterations = -1;

      // WHEN asserting toResolveWithinQuantile
      // THEN expect a descriptive error
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: givenIterations,
          quantile: 95
        });
      }).rejects.toThrowError(`jest-performance-matchers: iterations must be a positive integer, received ${givenIterations}`);
    });

    test("should throw when setup is not a function", async () => {
      // GIVEN a non-function setup
      const givenSetup = "foo-not-a-function";

      // WHEN asserting toResolveWithinQuantile
      // THEN expect a descriptive error
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          // @ts-expect-error - intentionally passing invalid setup for testing
          setup: givenSetup
        });
      }).rejects.toThrowError(`jest-performance-matchers: setup must be a function if provided, received ${typeof givenSetup}`);
    });

    test("should throw when teardown is not a function", async () => {
      // GIVEN a non-function teardown
      const givenTeardown = 42;

      // WHEN asserting toResolveWithinQuantile
      // THEN expect a descriptive error
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          // @ts-expect-error - intentionally passing invalid teardown for testing
          teardown: givenTeardown
        });
      }).rejects.toThrowError(`jest-performance-matchers: teardown must be a function if provided, received ${typeof givenTeardown}`);
    });

    test("should throw a validation error when allowedErrorRate is negative", async () => {
      // GIVEN a negative allowedErrorRate
      const givenAllowedErrorRate = -0.1;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).rejects.toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate exceeds 1", async () => {
      // GIVEN an allowedErrorRate above the maximum
      const givenAllowedErrorRate = 1.1;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).rejects.toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate is NaN", async () => {
      // GIVEN NaN as allowedErrorRate
      const givenAllowedErrorRate = NaN;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).rejects.toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });

    test("should throw a validation error when allowedErrorRate is Infinity", async () => {
      // GIVEN Infinity as allowedErrorRate
      const givenAllowedErrorRate = Infinity;

      // WHEN asserting with the invalid rate,
      // THEN a descriptive error is thrown
      await expect(async () => {
        await expect(async () => Promise.resolve()).toResolveWithinQuantile(10, {
          iterations: 5,
          quantile: 95,
          allowedErrorRate: givenAllowedErrorRate
        });
      }).rejects.toThrowError(`jest-performance-matchers: allowedErrorRate must be a number between 0 and 1, received ${givenAllowedErrorRate}`);
    });
  });
});
