const TarSC = artifacts.require("Tar");
const PaginationLibrary = artifacts.require("Pagination");

const PolicyLib = artifacts.require("PolicyLib");
const PolicyStoreLib = artifacts.require("PolicyStoreLib");

const RevocationLib = artifacts.require("RevocationLib");
const RevocationStoreLib = artifacts.require("RevocationStoreLib");

const AuthLib = artifacts.require("AuthLib");
const AuthStoreLib = artifacts.require("AuthStoreLib");

const AppLib = artifacts.require("AppLib");
const AppStoreLib = artifacts.require("AppStoreLib");

const AdminLib = artifacts.require("AdminLib");
const AdminStoreLib = artifacts.require("AdminStoreLib");
const AttributeStoreLib = artifacts.require("AttributeStoreLib");

module.exports = async (deployer, network, accounts) => {
  /**
   * Constants
   */

  const version = 3;
  const admin = accounts[0];

  console.log(`Deploying Tar smart contract on network:${network}`);
  await deployer.deploy(PaginationLibrary);
  await deployer.link(PaginationLibrary, [AdminLib]);
  await deployer.link(PaginationLibrary, [PolicyLib]);
  await deployer.link(PaginationLibrary, [AuthLib]);
  await deployer.link(PaginationLibrary, [AppLib]);

  await deployer.deploy(PolicyLib);
  await deployer.deploy(PolicyStoreLib);
  await deployer.deploy(RevocationLib);
  await deployer.deploy(RevocationStoreLib);
  await deployer.deploy(AuthLib);
  await deployer.deploy(AuthStoreLib);
  await deployer.deploy(AppLib);
  await deployer.deploy(AppStoreLib);
  await deployer.deploy(AdminLib);
  await deployer.deploy(AdminStoreLib);
  await deployer.deploy(AttributeStoreLib);

  await deployer.link(PaginationLibrary, [TarSC]);

  await deployer.link(AttributeStoreLib, [TarSC]);
  await deployer.link(AdminStoreLib, [TarSC]);
  await deployer.link(AdminLib, [TarSC]);
  await deployer.link(PolicyStoreLib, [TarSC]);
  await deployer.link(PolicyLib, [TarSC]);
  await deployer.link(AppStoreLib, [TarSC]);
  await deployer.link(AppLib, [TarSC]);
  await deployer.link(AuthStoreLib, [TarSC]);
  await deployer.link(AuthLib, [TarSC]);
  await deployer.link(RevocationStoreLib, [TarSC]);
  await deployer.link(RevocationLib, [TarSC]);
  await deployer.deploy(TarSC); // Tar SC deployed with blank state
  const tokenSCInstance = await TarSC.deployed();
  console.log(`Tar Contract deployed at address ${TarSC.address}`);

  // Initialize proxy with token address and call initialize function 'initialize' that replace the constructor
  await tokenSCInstance.initialize(version, { from: admin });
  console.log(`
  --Tar initialized with:
    ProxyAddress:${tokenSCInstance.address}
    Version:${version} `);

  // we verify that indeed calling Tar SC function at the proxy address works
  const vers = await tokenSCInstance.version({ from: admin });
  console.log(`  ----verification Tar version :${vers}`);
};
