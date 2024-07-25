/**
 * Hardhat doesn't support ESM in TypeScript projects.
 * https://hardhat.org/hardhat-runner/docs/advanced/using-esm#hardhat-support-for-es-modules
 */
const path = require("node:path");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

const tntScPath = path.resolve(
  require.resolve("@ebsiint-sc/track-and-trace"),
  "../..", // relative to "dist/index.js"
);

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { hardfork: "berlin", allowUnlimitedContractSize: true },
  },
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  paths: {
    artifacts: path.resolve(tntScPath, "./artifacts"),
    cache: path.resolve(tntScPath, "./cache"),
  },
};

module.exports = config;
