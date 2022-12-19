/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = {
  preset: "ts-jest",
  testTimeout: 90000,
  maxConcurrency: 1,
  testEnvironment: "node",
  injectGlobals: false,
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(axios))"],
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: ["src/**/*.(t|j)s", "!**/*.d.ts", "!src/main.ts"],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  resolver: path.resolve(__dirname, "../../jest-resolver.js"),
};
