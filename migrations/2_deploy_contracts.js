/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-undef */
const TirSC = artifacts.require("Tir");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const initWeb3 = require("./helpers/web3Provider");
const getAccounts = require("./helpers/getAccounts");

module.exports = async (deployer, network, accounts) => {
  const web3 = initWeb3(network);

  /**
   * Constants
   */

  const version = 1;
  const {proxyAdmin, operator, pausers} = getAccounts(accounts);

  console.log(`Deploying Proxy smart contract on network:${network}`);
  await deployer.deploy(OwnedUpgradeabilityProxy); // Proxy deployed with blank state
  console.log(
    `Proxy Contract deployed at address ${OwnedUpgradeabilityProxy.address}`
  );
  const proxySCInstance = await OwnedUpgradeabilityProxy.deployed();

  console.log(`Deploying Tir smart contract on network:${network}`);
  await deployer.deploy(TirSC); // TIR SC deployed with blank state
  const tokenSCInstance = await TirSC.deployed();
  console.log(`Tir Contract deployed at address ${TirSC.address}`);

  // encode the initialize function of the TIR SC to setup some variables
  const initializeData = web3.eth.abi.encodeFunctionCall(
    {
      name: "initialize",
      type: "function",
      inputs: [
        {
          type: "uint256",
          name: "version",
        },
        {
          type: "address",
          name: "operator",
        },
        {
          type: "address[]",
          name: "pausers",
        },
      ],
    },
    [web3.utils.toHex(version), operator, pausers]
  );

  // Initialize proxy with token address and call initialize function 'initialize' that replace the constructor
  await proxySCInstance.initialize(
    tokenSCInstance.address,
    proxyAdmin,
    initializeData,
    {from: proxyAdmin}
  );
  console.log(`
  --Proxy initialized with:
    ProxyAddress:${proxySCInstance.address}
    Implementation:${TirSC.address}
    proxyAdmin:${proxyAdmin}
    Version:${version}
    Operator:${operator}
    pausers:${JSON.stringify(pausers)}`);

  // we force the usage of the TIR SC interface at the proxy address
  const tirSCProxied = await TirSC.at(proxySCInstance.address, {
    from: proxyAdmin,
  });
  // we verify that indeed calling TIR SC function at the proxy address works
  const vers = await tirSCProxied.version({from: operator});
  console.log(`  ----verification Tir version through proxy:${vers}`);
};
