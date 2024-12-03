import { HardhatUserConfig, task } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import * as fs from "node:fs";

const mnemonicPath = `${__dirname}/.secret.mnemonic`;
let mnemonic = "test test test test test test test test test test test junk";
if (fs.existsSync(mnemonicPath)) {
  console.log(".secret.mnemonic exists and will be used");
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
}

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) console.log(account.address);
});
task(
  "blockNumber",
  "Prints the current block number",
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log(`Current block number: ${blockNumber}`);
    });
  },
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
  abiExporter: {
    clear: true,
    flat: true,
    path: "./src/abi",
  },

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      accounts: { mnemonic },
      url: "http://localhost:8545",
    },
    mainnet: {
      accounts: { mnemonic },
      url: "https://api-test.ebsi.eu/ledger/v3/blockchains/besu",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./tests",
  },
  solidity: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
    version: "0.8.12",
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
};

export default config;
