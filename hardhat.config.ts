import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "hardhat-typechain";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "@tenderly/hardhat-tenderly";
import { HardhatUserConfig, task } from "hardhat/config";
import * as fs from "fs";

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
let mnemonic = "test test test test test test test test test test test junk";
try {
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
} catch (err) {
  console.error(err);
}
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => console.log(account.address));
});
// task action function receives the Hardhat Runtime Environment as second argument
task(
  "blockNumber",
  "Prints the current block number",
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log(`Current block number: ${blockNumber}`);
    });
  }
);
task("chainId", "Prints the current chain ID", async (_, { ethers }) => {
  await ethers.provider.getNetwork().then((net) => {
    console.log(`Current chain ID: ${net.chainId}`);
  });
});
task("tx", "Prints the detail for the transaction hash")
  .addParam("hash", "The transaction's hash")
  .setAction(async (taskArgs: { hash: string }, { ethers }) => {
    await ethers.provider
      .getTransactionReceipt(taskArgs.hash)
      .then((receipt) => {
        console.log(`
        From: ${receipt.from}
        To: ${receipt.to}
        Status: ${receipt.status === 1 ? "Ok" : "Error"}
        BlockNumber: ${receipt.blockNumber}
        GasUsed: ${receipt.gasUsed.toString()}
        Confirmations: ${receipt.confirmations}`);
      });
  });
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: `http://localhost:8545`,
      accounts: { mnemonic },
      gas: 20000000,
      gasPrice: 0,
      loggingEnabled: true,
    },
    ebsi: {
      url: `https://api.prod.ebsi.xyz/ledger/v2/blockchains/besu`,
      accounts: { mnemonic },
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
    multiSig: "0x28774ee74a79e27af87f4a7668542be43e2f742b",
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
