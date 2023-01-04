/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testTimeout: 90000,
  maxConcurrency: 1,
  testEnvironment: "node",
  injectGlobals: false,
  rootDir: ".",
  roots: ["<rootDir>/src/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  transformIgnorePatterns: ["/node_modules/"],
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: ["src/**/*.(t|j)s", "!**/*.d.ts"],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
  resolver: path.resolve(__dirname, "../../jest-resolver.js"),
};
