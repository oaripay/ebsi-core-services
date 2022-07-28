module.exports = {
  extends: "solhint:recommended",
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "compiler-version": ["error", "^0.8.0"],
    // inline are needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
    // we use library wich trigger to often this rule
    "mark-callable-contracts": "off",
  },
};
