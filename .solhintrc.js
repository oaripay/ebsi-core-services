module.exports = {
  extends: "solhint:recommended",

  rules: {
    // we are using solc 0.8.12
    "compiler-version": ["error", "0.8.12"],
    // inline are needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
  },
};
