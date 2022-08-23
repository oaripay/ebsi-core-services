// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 60000,
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!src/contracts/**/*.(t|j)s",
    "!src/main.ts",
    "!**/*.d.ts",
  ],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
  moduleNameMapper: {
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
  resolver: path.resolve(__dirname, "../../jest-resolver.js"),
};
