module.exports = {
  preset: "./jest-puppeteer.preset.js",
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
  moduleNameMapper: {
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
  resolver: "<rootDir>/jest-resolver.js",
  // Puppeteer config
  // Un-comment the following lines to see the browser window
  // launch: {
  //   headless: false,
  // },
};
