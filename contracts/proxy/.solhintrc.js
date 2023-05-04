module.exports = {
  extends: "solhint:recommended",
  rules: {
    // we are using solc ^0.8.0
    "compiler-version": ["error", "^0.8.0"],
    "func-visibility": ["warn", { ignoreConstructors: true }],
    // inline are needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
    // needed for virtual functions
    "no-empty-blocks": "off",
    // needed for proxy delegatecall
    "avoid-low-level-calls": "off",
  },
};
