/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

const tsPreset = require('ts-jest/jest-preset')
module.exports = {
  ...tsPreset,
  testEnvironment: 'node',
  collectCoverageFrom: [
    "src/**"
  ],
};
