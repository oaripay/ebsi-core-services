/* eslint-disable import/no-extraneous-dependencies */
import path from "node:path";
import "@nomiclabs/hardhat-ethers";
import type { HardhatUserConfig } from "hardhat/config";

const tlrsScPath = path.resolve(
  require.resolve("@ebsiint-sc/trusted-ledgers-registry"),
  "../.." // relative to "dist/index.js"
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { hardfork: "berlin" },
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
    artifacts: path.resolve(tlrsScPath, "./artifacts"),
  },
};

export default config;
