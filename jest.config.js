module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,
  rootDir: ".",
  roots: ["<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).+(ts|tsx|js)"],
  moduleFileExtensions: ["js", "json"],
  coverageDirectory: "./coverage/",
  collectCoverage: true,
};
