import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "@tenderly/hardhat-tenderly";
import "./tasks/index";
import { HardhatUserConfig } from "hardhat/config";
import * as fs from "fs";
import "@nomiclabs/hardhat-etherscan";

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

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: `https://ebsi:TTvD76znMvypBcNQ@www.test.intebsi.xyz/besu`,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    sokol: {
      url: `https://ebsi:TTvD76znMvypBcNQ@www.test.intebsi.xyz/besu`,
      accounts: [privKey],
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
      saveDeployments: true,
    },
    localWithData: {
      url: `https://ebsi:TTvD76znMvypBcNQ@www.test.intebsi.xyz/besu`,
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
    apiKey: "abc",
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
