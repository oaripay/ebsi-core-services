import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract:
      "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
  });
  const optsPagination = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };
  const didTimestampLib = await deployments.deploy("DidTimestampLib", {
    ...optsPagination,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidTimestampLib.sol:DidTimestampLib",
  });
  const didRecordLib = await deployments.deploy("DidRecordLib", {
    from: deployer,
    log: true,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidRecordLib.sol:DidRecordLib",
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });

  const didPolicyLib = await deployments.deploy("DidPolicyLib", {
    ...opts,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidPolicyLib.sol:DidPolicyLib",
    libraries: {
      Pagination: pagination.address,
    },
  });

  const hashAlgoLib = await deployments.deploy("HashAlgoLib", {
    ...optsPagination,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/HashAlgoLib.sol:HashAlgoLib",
  });

  const ts = await deployments.deploy("DidRegistry", {
    from: deployer,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidRegistry.sol:DidRegistry",
    libraries: {
      DidRecordLib: didRecordLib.address,
      HashAlgoLib: hashAlgoLib.address,
      DidTimestampLib: didTimestampLib.address,
      Pagination: pagination.address,
      DidPolicyLib: didPolicyLib.address,
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
  "Pagination",
];
