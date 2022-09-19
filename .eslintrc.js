module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  globals: {
    // truffle globals
    artifacts: true,
    contract: true,
    assert: true,
    web3: true,
  },
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
  rules: {
    // we use it for scripts
    "no-console": "off",
    // we use it for tests
    "func-names": "off",
    // we use it for tests
    "import/no-extraneous-dependencies": "off",
    // we use it for tests
    "no-unused-expressions": "off",
  },
};
