/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testTimeout: 120000,
  maxConcurrency: 1,
  testEnvironment: "node",
  injectGlobals: false,
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: [
    "**/?(*.|*-)+(spec|test).ts",
    // Exclude EU Login test (requires Puppeteer)
    "!**/eu-login-onboarding.e2e-spec.ts",
  ],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(axios))",
    "/apis/shared/dist/",
    "jest-puppeteer.config.js",
  ],
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!**/*.d.ts",
    "!src/main.ts",
    "!src/logger/logger.ts",
  ],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
  resolver: path.resolve(__dirname, "../../jest-resolver.js"),
};
