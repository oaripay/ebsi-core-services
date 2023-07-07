import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import type { HardhatUserConfig } from "hardhat/config";
import type { TypechainUserConfig } from "@typechain/hardhat/dist/types";
import type { AbiExporterUserConfig } from "hardhat-abi-exporter";

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const config: HardhatUserConfig & {
  typechain: TypechainUserConfig;
  abiExporter: AbiExporterUserConfig;
  namedAccounts?: {
    [name: string]:
      | string
      | number
      | { [network: string]: null | number | string };
  };
} = {
  defaultNetwork: "hardhat",
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./src/abi",
    clear: true,
    flat: true,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // remove viaIR when legacy contract are deprecated
          viaIR: true,
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "src/artifacts",
  },
};

export default config;
