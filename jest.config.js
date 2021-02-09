module.exports = {
  testTimeout: 60000,
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).+(ts|tsx|js)"],
  moduleFileExtensions: ["js", "json"],
  coverageDirectory: "./coverage/",
  collectCoverage: true,
};
