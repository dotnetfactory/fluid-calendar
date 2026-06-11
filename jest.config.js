/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  transform: {
    // isolatedModules keeps jest memory bounded: type-checking is covered by
    // `tsc --noEmit`, so tests only need transpilation.
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
};

module.exports = config;
