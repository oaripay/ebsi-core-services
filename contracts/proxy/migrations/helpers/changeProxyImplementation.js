const HDWalletProvider = require("@truffle/hdwallet-provider");
const os = require("os");
const fs = require("fs");

const { exit } = require("process");

const mnemonic = fs.readFileSync(".secret.mnemonic").toString().trim();
const [contractAddress, newProxyImplementation] = process.argv.slice(2);
const nodeURL = `http://localhost:8545`;
console.log(`-----------NodeRL:${nodeURL}${os.EOL}`);
const prov = new HDWalletProvider(mnemonic, nodeURL);

const Web3 = require("web3");

const web3 = new Web3(prov);

const getBalances = async (address) => {
  return web3.eth.getBalance(address);
};
const Contract = require("web3-eth-contract");
const jsonInterface = require("../../build/contracts/OwnedUpgradeabilityProxy.json");
// set provider for all later instances to use
Contract.setProvider(prov);

/**
 * CONSTANT
 *
 *  */

const gasPrice = web3.utils.toWei("0", "gwei");
const proxyAdmin = prov.addresses[0];

const getAdmin = (adminAddress) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.admin().call({ from: adminAddress });
};
const getImplementation = (adminAddress) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.implementation().call({ from: adminAddress });
};

const transferImplementation = (admin, newImpl) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.upgradeTo(newImpl).send({
    from: admin,
    gasPrice,
  });
};
console.log(` prov.addresses : ${JSON.stringify(prov.addresses)}${os.EOL}`);
getBalances(proxyAdmin).then(async (balance) => {
  console.log(
    `-----------Admin Proxy address: ${proxyAdmin} balance: ${web3.utils.fromWei(
      balance,
      "ether"
    )} ETH${os.EOL}`
  );

  const currentAdmin = await getAdmin(proxyAdmin);
  console.log(`current Admin: ${JSON.stringify(currentAdmin)} ${os.EOL}`);
  const currentImplementation = await getImplementation(proxyAdmin);
  console.log(
    `current Implementation : ${JSON.stringify(currentImplementation)}${os.EOL}`
  );

  console.log(
    `--Transfer Implementation from ${currentImplementation} to ${newProxyImplementation} ${os.EOL}`
  );
  const receipt = await transferImplementation(
    proxyAdmin,
    newProxyImplementation
  );
  console.log(`receipt : ${JSON.stringify(receipt)}${os.EOL}`);
  exit(0);
});
