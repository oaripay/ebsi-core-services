/* eslint-disable import/no-extraneous-dependencies */
import path from "node:path";
import "@nomiclabs/hardhat-ethers";
import type { HardhatUserConfig } from "hardhat/config";

const tprScPath = path.resolve(
  require.resolve("@ebsiint-sc/trusted-policies-registry"),
  "../.." // relative to "dist/index.js"
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      hardfork: "berlin",
    },
  },
  paths: {
    artifacts: path.resolve(tprScPath, "./artifacts"),
  },
};

export default config;
