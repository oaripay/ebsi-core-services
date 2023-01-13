import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "./tasks/index";
import { HardhatUserConfig } from "hardhat/config";
import * as fs from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, ".env") });

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
const privKeyPath = `${__dirname}/.secret.privatekey`;
let mnemonic = "test test test test test test test test test test test junk";
let privKey =
  "0x6a41084b4e952f85d4ea71f1af325fa9925f98befd72f8a12534c67b5679fe0e";

if (fs.existsSync(mnemonicPath)) {
  console.log(".secret.mnemonic exists and will be used");
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
  privKey = fs.readFileSync(privKeyPath).toString().trim();
}

const accounts = {
  // use default accounts
  mnemonic,
};

const { HARDHAT_NETWORK_URL, ETHERSCAN_API_KEY } = process.env;

const config: HardhatUserConfig = {
  defaultNetwork: "local",
  networks: {
    hardhat: {},
    local: {
      url: HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    sokol: {
      url: HARDHAT_NETWORK_URL,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    localWithData: {
      url: HARDHAT_NETWORK_URL,
      accounts,
      gas: 60000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    ebsi: {
      url: `https://api.prod.ebsi.xyz/ledger/v2/blockchains/besu`,
      accounts,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "conformance",
        chainId: 6178,
        urls: {
          apiURL: "https://blockscout-conformance.ebsi.eu/api",
          browserURL: "https://blockscout-conformance.ebsi.eu/",
        },
      },
    ],
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
    artifacts: "./src/artifacts",
    imports: "./src/artifacts",
  },
};

export default config;
