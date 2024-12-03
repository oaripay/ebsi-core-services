module.exports = {
  collectCoverage: true,
  coverageDirectory: "./coverage/",
  moduleFileExtensions: ["js", "json"],
  rootDir: ".",
  roots: ["<rootDir>/tests/"],
  testEnvironment: "node",
  testMatch: ["**/?(*.|*-)+(spec|test).+(ts|tsx|js)"],
  testTimeout: 30_000,
};
