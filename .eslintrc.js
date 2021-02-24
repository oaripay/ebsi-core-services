module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "plugin:jest/recommended",
    "plugin:jest/style",
    "plugin:prettier/recommended",
  ],
  globals: {
    // truffle globals
    artifacts: true,
    contract: true,
    assert: true,
    web3: true,
  },
  ignorePatterns: ["**/contracts/bootstrap-ethereum-sc"],
  rules: {
    "no-console": "off",
  },
};
