// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultConfig = require("./jest.config");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...defaultConfig,
  globalSetup: "jest-environment-puppeteer/setup",
  globalTeardown: "jest-environment-puppeteer/teardown",
  testEnvironment: "jest-environment-puppeteer",
  // Include only EU Login test
  testMatch: ["**/eu-login-onboarding.e2e-spec.ts"],
};
