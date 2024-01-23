import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "@openzeppelin/hardhat-upgrades";
import "./tasks/index";
import * as fs from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";
import type { TypechainUserConfig } from "@typechain/hardhat/dist/types";
import type { AbiExporterUserConfig } from "hardhat-abi-exporter";

dotenv.config({ path: resolve(__dirname, ".env") });

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
const privKeyPath = `${__dirname}/.secret.privatekey`;
let mnemonic =
  "test test test test test test test test test test test junk" ||
  process.env.MNEMONIC;
let privKey =
  "0x6a41084b4e952f85d4ea71f1af325fa9925f98befd72f8a12534c67b5679fe0e" ||
  process.env.PRIVATE_KEY;

if (fs.existsSync(mnemonicPath)) {
  console.log(".secret.mnemonic exists and will be used");
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
  privKey = fs.readFileSync(privKeyPath).toString().trim();
}

const accounts = {
  // use default accounts
  mnemonic,
};

const {
  TEST_HARDHAT_NETWORK_URL,
  PILOT_HARDHAT_NETWORK_URL,
  CONFORMANCE_HARDHAT_NETWORK_URL,
} = process.env;

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
  defaultNetwork: "local",
  networks: {
    hardhat: {},
    test: {
      url: TEST_HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
    },
    pilot: {
      url: PILOT_HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
    },
    conformance: {
      url: CONFORMANCE_HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
    },
    local: {
      url: TEST_HARDHAT_NETWORK_URL,
      accounts: [privKey],
      // accounts,
      gas: 20000000,
      gasPrice: 0,
    },
    sokol: {
      url: TEST_HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
    },
    localWithData: {
      url: TEST_HARDHAT_NETWORK_URL,
      accounts,
      gas: 70000000,
      gasPrice: 0,
    },
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./src/abi",
    clear: true,
    flat: true,
  },
  namedAccounts: {
    deployer: 0,
    user: 1,
    admin: 2,
    multiSig: {
      default: 3, // here this will by default take the first account as deployer
      local: "0x28774ee74a79e27af87f4a7668542be43e2f742b", // it can also specify a specific network name
    },
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
    deploy: "./scripts/deployment",
    deployments: "./deployments",
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "src/artifacts",
  },
};

export default config;
