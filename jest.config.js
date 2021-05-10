module.exports = {
  preset: "ts-jest",
  testTimeout: 90000,
  maxConcurrency: 1,
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!**/*.d.ts",
    "!src/main.ts",
    "!src/logger/logger.ts",
  ],
  coverageReporters: ["text", "lcov", "json", "clover", "cobertura"],
};
