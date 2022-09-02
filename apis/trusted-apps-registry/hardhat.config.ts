/* eslint-disable import/no-extraneous-dependencies */
import path from "node:path";
import "@nomiclabs/hardhat-ethers";
import type { HardhatUserConfig } from "hardhat/config";

const tarScPath = path.resolve(
  require.resolve("@ebsiint-sc/trusted-apps-registry"),
  "../.." // relative to "dist/index.js"
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { hardfork: "berlin" },
  },
  paths: {
    artifacts: path.resolve(tarScPath, "./artifacts"), // necessary for things like `hre.ethers.getContractFactory("Tar")`
  },
};

export default config;
