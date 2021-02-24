module.exports = {
  extends: "solhint:recommended",
  excludedFiles: ["**/contracts/bootstrap-ethereum-sc"],
  rules: {
    // we are using solc ^0.8.0
    "compiler-version": ["error", "^0.8.0"],
    // inline are needed to store data at a specific location see *Storage.sol
    "no-inline-assembly": "off",
  },
};
