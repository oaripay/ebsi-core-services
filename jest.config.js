module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/api/", "<rootDir>/tests/"],
  testMatch: ["**/?(*.)+(spec|e2e-spec|test).+(ts|tsx|js)"],
  testResultsProcessor: "jest-sonar-reporter",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!**/node_modules/**",
  ],
  collectCoverage: true,
  reporters: ["default", "jest-sonar"],
  globals: {
    "ts-jest": {
      diagnostics: true,
      warnOnly: true,
      ignoreCodes: [
        18002, // The ‘files’ list in config file is empty. (it is strongly recommended to include this one)
      ],
      pretty: true,
    },
  },
};
