const TirSC = artifacts.require("Tir");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const initWeb3 = require("./helpers/web3Provider");
const getAccounts = require("./helpers/getAccounts");

module.exports = async (deployer, network, accounts) => {
  const web3 = initWeb3(network);

  /**
   * Constants
   */

  const version = 2;
  const { proxyAdmin, pausers } = getAccounts(accounts);

  console.log(`Deploying Proxy smart contract on network:${network}`);
  await deployer.deploy(OwnedUpgradeabilityProxy); // Proxy deployed with blank state
  console.log(
    `Proxy Contract deployed at address ${OwnedUpgradeabilityProxy.address}`
  );
  const proxySCInstance = await OwnedUpgradeabilityProxy.deployed();

  const ImplementationInstance = {
    address: "0x34F7b93b308bBFC04fb02321538fD316016090aD",
  };
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
      ],
    },
    [web3.utils.toHex(version)]
  );

  // Initialize proxy with token address and call initialize function 'initialize' that replace the constructor
  await proxySCInstance.initialize(
    ImplementationInstance.address,
    proxyAdmin,
    initializeData,
    { from: proxyAdmin }
  );
  console.log(`
  --Proxy initialized with:
    ProxyAddress:${proxySCInstance.address}
    Implementation:${ImplementationInstance.address}
    proxyAdmin:${proxyAdmin}
    Version:${version}
    pausers:${JSON.stringify(pausers)}`);

  // we force the usage of the TIR SC interface at the proxy address
  const tirSCProxied = await TirSC.at(proxySCInstance.address, {
    from: proxyAdmin,
  });
  // we verify that indeed calling TIR SC function at the proxy address works
  const vers = await tirSCProxied.version({ from: pausers[0] });
  console.log(`  ----verification Tir version through proxy:${vers}`);
};
