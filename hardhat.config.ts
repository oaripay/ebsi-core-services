import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "hardhat-typechain";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "@tenderly/hardhat-tenderly";
import "./tasks/index";
import { HardhatUserConfig } from "hardhat/config";
import * as fs from "fs";

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
const privKeyPath = `${__dirname}/.secret.privatekey`;
let mnemonic = "test test test test test test test test test test test junk";
let privKey = "";
try {
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
  privKey = fs.readFileSync(privKeyPath).toString().trim();
} catch (err) {
  console.error(err);
}
const accounts = {
  // use default accounts
  mnemonic,
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: `https://www.test.intebsi.xyz/jsonrpc`,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    localWithData: {
      url: `http://localhost:8545`,
      accounts,
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    ebsi: {
      url: `https://api.prod.ebsi.xyz/ledger/v2/blockchains/besu`,
      accounts,
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
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
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
    artifacts: "./artifacts",
  },
};

export default config;
