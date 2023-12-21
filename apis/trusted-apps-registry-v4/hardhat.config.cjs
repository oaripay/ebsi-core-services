/**
 * Hardhat doesn't support ESM in TypeScript projects.
 * https://hardhat.org/hardhat-runner/docs/advanced/using-esm#hardhat-support-for-es-modules
 */
const path = require("node:path");
require("@nomiclabs/hardhat-ethers");

const tarScPath = path.resolve(
  require.resolve("@ebsiint-sc/trusted-apps-registry-v3"),
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
    artifacts: path.resolve(tarScPath, "./artifacts"), // necessary for things like `hre.ethers.getContractFactory("Tar")`
  },
};

module.exports = config;
