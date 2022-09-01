/* eslint-disable import/no-extraneous-dependencies */
import "@nomiclabs/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";
import path from "path";

console.error(
  path.resolve(
    require.resolve("@ebsiint-sc/trusted-apps-registry"),
    "../../contracts"
  )
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      hardfork: "berlin",
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  paths: {
    sources: path.resolve(
      require.resolve("@ebsiint-sc/trusted-apps-registry"),
      "../../contracts"
    ),
    cache: path.resolve(
      require.resolve("@ebsiint-sc/trusted-apps-registry"),
      "../../cache"
    ),
    artifacts: path.resolve(
      require.resolve("@ebsiint-sc/trusted-apps-registry"),
      "../../artifacts"
    ),
  },
};

export default config;
