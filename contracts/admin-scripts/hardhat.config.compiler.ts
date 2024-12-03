import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";

import type { TypechainUserConfig } from "@typechain/hardhat/dist/types";
import type { AbiExporterUserConfig } from "hardhat-abi-exporter";
import type { HardhatUserConfig } from "hardhat/config";

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const config: HardhatUserConfig & {
  abiExporter: AbiExporterUserConfig;
  namedAccounts?: Record<
    string,
    number | Record<string, null | number | string> | string
  >;
  typechain: TypechainUserConfig;
} = {
  abiExporter: {
    clear: true,
    flat: true,
    path: "./src/abi",
  },
  defaultNetwork: "hardhat",
  paths: {
    artifacts: "src/artifacts",
    cache: "./cache",
    sources: "./contracts",
  },
  solidity: {
    compilers: [
      {
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // remove viaIR when legacy contract are deprecated
          viaIR: true,
        },
        version: "0.8.12",
      },
    ],
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
};

export default config;
