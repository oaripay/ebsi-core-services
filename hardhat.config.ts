/* eslint-disable import/no-extraneous-dependencies */
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
  },
  typechain: {
    outDir: "src/contracts",
    target: "ethers-v5",
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  paths: {
    sources: "./submodules/trusted-apps-registry-ethereum-sc/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
