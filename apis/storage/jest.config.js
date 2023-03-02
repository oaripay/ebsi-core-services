/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testTimeout: 90000,
  maxConcurrency: 1,
  testEnvironment: "node",
  injectGlobals: false,
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.test.json", isolatedModules: true },
    ],
  },
  transformIgnorePatterns: ["/node_modules/", "/apis/shared/dist/"],
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!**/*.d.ts",
    "!src/main.ts",
    "!src/logger/logger.ts",
  ],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
  setupFilesAfterEnv: ["./tests/jest.setup.ts"],
  resolver: path.resolve(__dirname, "../../jest-resolver.js"),
};
