const TirSC = artifacts.require("Tir");
const PaginationLibrary = artifacts.require("Pagination");

module.exports = async (deployer, network, accounts) => {
  /**
   * Constants
   */

  const version = 3;
  const admin = accounts[0];

  console.log(`Deploying Tir smart contract on network:${network}`);
  await deployer.deploy(PaginationLibrary);

  await deployer.link(PaginationLibrary, [TirSC]);

  await deployer.deploy(TirSC); // TIR SC deployed with blank state
  const tokenSCInstance = await TirSC.deployed();
  console.log(`Tir Contract deployed at address ${TirSC.address}`);

  // Initialize proxy with token address and call initialize function 'initialize' that replace the constructor
  await tokenSCInstance.initialize(version, { from: admin });
  console.log(`
  --TIR initialized with:
    ProxyAddress:${tokenSCInstance.address}
    Version:${version} `);

  // we verify that indeed calling TIR SC function at the proxy address works
  const vers = await tokenSCInstance.version({ from: admin });
  console.log(`  ----verification Tir version :${vers}`);
};
