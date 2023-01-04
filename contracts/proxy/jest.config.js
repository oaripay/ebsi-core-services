/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testTimeout: 30000,
  maxConcurrency: 1,
  testEnvironment: "node",
  injectGlobals: false,
  rootDir: ".",
  roots: ["<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).+(ts|tsx|js)"],
  moduleFileExtensions: ["js", "json"],
  coverageDirectory: "./coverage/",
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!**/*.d.ts",
    "!src/main.ts",
    "!src/logger/logger.ts",
  ],
};
