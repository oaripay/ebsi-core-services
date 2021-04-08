import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  const pagination = await deployments.deploy(
    "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
    opts
  );
  const optsPagination = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };
  const didTimestampLib = await deployments.deploy(
    "DidTimestampLib",
    optsPagination
  );
  const didRecordLib = await deployments.deploy("DidRecordLib", {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });
  const didMethodLib = await deployments.deploy("DidMethodLib", optsPagination);

  const hashAlgoLib = await deployments.deploy(
    "contracts/did-registry-ethereum-sc/contracts/did-registry/HashAlgoLib.sol:HashAlgoLib",
    optsPagination
  );
  const policyLib = await deployments.deploy(
    "contracts/did-registry-ethereum-sc/contracts/did-registry/PolicyLib.sol:PolicyLib",
    optsPagination
  );
  const administratorLib = await deployments.deploy(
    "contracts/did-registry-ethereum-sc/contracts/did-registry/AdministratorLib.sol:AdministratorLib",
    optsPagination
  );

  const ts = await deployments.deploy("DidRegistry", {
    from: deployer,
    libraries: {
      DidRecordLib: didRecordLib.address,
      DidMethodLib: didMethodLib.address,
      PolicyLib: policyLib.address,
      AdministratorLib: administratorLib.address,
      HashAlgoLib: hashAlgoLib.address,
      DidTimestampLib: didTimestampLib.address,
      Pagination: pagination.address,
    },
    log: true,
  });

  deployments.log("Did Registry deployed at:", ts.address);
};
export default func;
func.tags = ["DidRegistry"];
func.dependencies = [
  "AdministratorLib",
  "PolicyLib",
  "HashAlgoLib",
  "DidTimestampLib",
  "DidRecordLib",
  "DidMethodLib",
  "Pagination",
];
