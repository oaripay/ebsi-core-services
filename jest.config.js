module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/tests/"],
  testMatch: ["**/?(*.|*-)+(spec|test).+(ts|tsx|js)"],
  moduleFileExtensions: ["js", "json"],
  coverageDirectory: "./coverage/",
  collectCoverage: true,
};
