module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "plugin:jest/recommended",
    "plugin:jest/style",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["**/contracts/bootstrap-ethereum-sc"],
  globals: {
    // truffle globals
    artifacts: true,
    contract: true,
    assert: true,
    web3: true,
  },
  rules: {
    "no-console": "off",
  },
};
