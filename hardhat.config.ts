import { task, HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "hardhat-typechain";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import * as fs from "fs";

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
let mnemonic = "test test test test test test test test test test test junk";
try {
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
} catch (err) {
  console.error(err);
}

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => console.log(account.address));
});
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
// Some of the settings should be defined in `./config.js`.
// Go to https://hardhat.org/config/ for the syntax.
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",

  networks: {
    hardhat: {},
    local: {
      url: `http://localhost:8545`,
      accounts: { mnemonic },
    },
    mainnet: {
      url: `https://api.intebsi.xyz/ledger/v1/blockchains/besu`,
      accounts: { mnemonic },
    },
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./src/abi",
    flat: true,
    clear: true,
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
