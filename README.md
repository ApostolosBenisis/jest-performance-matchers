# jest-performance-matchers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimalistic library with jest matchers(assertions) for measuring code performance in node.js

## Prerequisites

jest-performance-matchers only supports

- Jest version 27.0.0 and newer
- Node.js version 14.0.0 and newer

## How to install

With npm:

```
npm intall --save-dev jest-performance-matchers
```

## Setup

Either import the matcher in test you want to use them :

```
import 'jest-performance-matchers';
```

Or create a setup script and add to `setupFilesAfterEnv` as instructed
in [Configuring Jest](https://jestjs.io/docs/configuration#setupfilesafterenv-array) :

```
// setupPerformanceMatchers.js

import 'jest-performance-matchers';
```

```
// jest.config.js

"jest": {
  "setupFilesAfterEnv": ['<rootDir>/setupPerformanceMatchers.js']
}
```

## How to use the matchers

### `.toCompleteWithin`

Assert that the synchronous code runs within the given duration:

```js
import 'jest-performance-matchers';

describe('Test the performance of synchronous code', () => {
    test("Should complete in 10 ms at most", () => {
        expect(() => {
            // Do something that should complete in 10 ms at most;
        }).toCompleteWithin(10);
    });

    test("Should not complete in less than 10 ms", () => {
        expect(() => {
            // Do something that should not complete in less than 10 ms;
        }).not.toCompleteWithin(10);
    });
});
```

### `.toCompleteWithinQuantile`

Assert that the synchronous code executed for `I` times, runs `Q`% the time within the given duration:

```js
import 'jest-performance-matchers';

describe('Test the performance of synchronous code', () => {
    test("Should be executed 100 times and 95% of the time should complete in 10 ms at most", () => {
        expect(() => {
            // Do something that 95% of the time should complete in 10 ms at most;
        }).toCompleteWithinQuantile(10, {iterations: 100, quantile: 95});
    });

    test("Should be executed 100 times and 95% of the time should not complete in less 10 ms", () => {
        expect(() => {
            // Do something that 95% of the time should not complete in less 10 ms;
        }).not.toCompleteWithinQuantile(10, {iterations: 100, quantile: 95});
    });
});
```

### `.toResolveWithin`

Assert that the asynchronous code resolves within the given duration:

```js
import 'jest-performance-matchers';

describe('Test the performance of asynchronous code', () => {
    test("Should resolve in 10 ms at most (async)", async () => {
        await expect(async () => {
            // await for a promise that should resolve in 10 ms at most;
        }).toResolveWithin(10);
    });

    test("Should resolve in 10 ms at most (promise)", async () => {
        return expect(() => {
            // return a promise that should resolve in 10 ms at most;
        }).toResolveWithin(10);
    });

    test("Should not resolve in less than 10 ms (promise)", async () => {
        return expect(() => {
            // return a promise that should not resolve in less than 10 ms;
        }).not.toResolveWithin(10);
    });
});
```

### `.toResolveWithinQuantile`

Assert that the asynchronous code resolves for `I` times, runs `Q`% the time within the given duration:

```js
import 'jest-performance-matchers';

describe('Test the performance of asynchronous code', () => {
    test("Should be executed 100 times and 95% of the time should resolve for 10 ms at most", async () => {
        await expect(async () => {
            // await for a promise that 95% of the time should resolve for 10 ms at most;
        }).toResolveWithinQuantile(10, {iterations: 100, quantile: 95});
    });

    test("Should be executed 100 times and 95% of the time should not resolve in less than 10 ms", async () => {
        await expect(() => {
            // return a promise that 95% of the time should not resolve in less than 10 ms;
        }).not.toResolveWithinQuantile(10, {iterations: 100, quantile: 95});
    });
});
```

## License

[MIT License](./LICENSE)
