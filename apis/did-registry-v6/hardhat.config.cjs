/**
 * Hardhat doesn't support ESM in TypeScript projects.
 * https://hardhat.org/hardhat-runner/docs/advanced/using-esm#hardhat-support-for-es-modules
 */
const path = require("node:path");
require("@nomiclabs/hardhat-ethers");

const didrScPath = path.resolve(
  require.resolve("@ebsiint-sc/did-registry-v4"),
  "../..", // relative to "dist/index.js"
);

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { allowUnlimitedContractSize: true, hardfork: "berlin" },
  },
  paths: {
    artifacts: path.resolve(didrScPath, "./artifacts"),
  },
  solidity: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
    version: "0.8.12",
  },
};

module.exports = config;
