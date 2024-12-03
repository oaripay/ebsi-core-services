module.exports = {
  extends: "solhint:recommended",

  rules: {
    // conflicts with prettier
    "bracket-align": "off",
    "compiler-version": ["error", "^0.8.12"],
    // we use libraries which trigger this rule too often
    "mark-callable-contracts": "off",
    // inline assembly is needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
  },
};
