/**
 * Hardhat doesn't support ESM in TypeScript projects.
 * https://hardhat.org/hardhat-runner/docs/advanced/using-esm#hardhat-support-for-es-modules
 */
require("@nomiclabs/hardhat-ethers");

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
    },
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
};

module.exports = config;
