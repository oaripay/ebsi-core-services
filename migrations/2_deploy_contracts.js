const TarSC = artifacts.require("Tar");
const PaginationLibrary = artifacts.require("Pagination");

module.exports = async (deployer, network, accounts) => {
  /**
   * Constants
   */

  const version = 3;
  const admin = accounts[0];

  console.log(`Deploying Tar smart contract on network:${network}`);
  await deployer.deploy(PaginationLibrary);

  await deployer.link(PaginationLibrary, [TarSC]);

  await deployer.deploy(TarSC); // Tar SC deployed with blank state
  const tokenSCInstance = await TarSC.deployed();
  console.log(`Tar Contract deployed at address ${TarSC.address}`);

  // Initialize proxy with token address and call initialize function 'initialize' that replace the constructor
  await tokenSCInstance.initialize(version, {from: admin});
  console.log(`
  --Tar initialized with:
    ProxyAddress:${tokenSCInstance.address}
    Version:${version} `);

  // we verify that indeed calling Tar SC function at the proxy address works
  const vers = await tokenSCInstance.version({from: admin});
  console.log(`  ----verification Tar version :${vers}`);
};
