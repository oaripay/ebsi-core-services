module.exports = {
  preset: "ts-jest",
  testTimeout: 150000,
  maxConcurrency: 1,
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleFileExtensions: ["js", "json", "ts"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: ["src/**/*.(t|j)s", "!**/*.d.ts", "!src/main.ts"],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
};
