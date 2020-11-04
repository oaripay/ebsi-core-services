module.exports = {
  extends: "solhint:recommended",
  rules: {
    // we are using solc ^0.7.0
    "compiler-version": ["error", "^0.7.0"],
    // inline are needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
    // needed for solc ^0.7.0
    "func-visibility": ["warn", {ignoreConstructors: true}],
  },
};
