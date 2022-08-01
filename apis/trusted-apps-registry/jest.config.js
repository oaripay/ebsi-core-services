module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 120000,
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
  resolver: "<rootDir>/jest-resolver.js",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
};
