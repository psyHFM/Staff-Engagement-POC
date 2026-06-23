// Constitution (testing-strategy.yaml): Jest + JSDOM, BDD Given-When-Then.
// Angular 22 is zoneless by default, so the zoneless test environment is used.
// CommonJS config — jest-preset-angular's ts-jest transform still compiles the
// .ts setup file and .spec.ts tests.
const { createCjsPreset } = require('jest-preset-angular/presets/index.js');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};