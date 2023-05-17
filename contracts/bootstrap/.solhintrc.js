module.exports = {
  extends: "solhint:recommended",
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "compiler-version": ["error", "0.8.12"],
    // inline is needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
    // we use a library which triggers too often this rule
    "mark-callable-contracts": "off",
  },
};
