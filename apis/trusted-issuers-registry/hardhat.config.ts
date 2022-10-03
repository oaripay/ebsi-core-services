/* eslint-disable import/no-extraneous-dependencies */
import "@nomiclabs/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      hardfork: "berlin",
    },
  },
};

export default config;
