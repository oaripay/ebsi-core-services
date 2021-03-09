import { ethers } from "ethers";
import ganache from "ganache-core";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
  SchemaLib__factory,
} from "../../src/contracts/trusted-schemas";
import PaginationArtifact from "../../submodules/trusted-schemas-registry-ethereum-sc/artifacts/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol/Pagination.json";

export async function deployLedgerScRegistryContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<SchemaSCRegistry> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const paginationAddress = (
    await new ethers.ContractFactory(
      PaginationArtifact.abi,
      PaginationArtifact.bytecode,
      owner
    ).deploy()
  ).address;

  const schemaLibAddress = (await new SchemaLib__factory(owner).deploy())
    .address;

  /*
    https://docs.soliditylang.org/en/latest/using-the-compiler.html#library-linking

    "If your contracts use libraries, you will notice that the bytecode contains substrings of the
    form __$53aea86b7d70b31448b230b20ae141a537$__. These are placeholders for the actual library
    addresses. The placeholder is a 34 character prefix of the hex encoding of the keccak256 hash
    of the fully qualified library name. The bytecode file will also contain lines of the form
    // <placeholder> -> <fq library name> at the end to help identify which libraries the
    placeholders represent. Note that the fully qualified library name is the path of its source
    file and the library name separated by :."

    Example:

    ```js
    const ethers = require("ethers");
    console.log(
      ethers.utils.keccak256(
        Buffer.from("contracts/ledger-sc-registry/SchemaLib.sol:SchemaLib", "utf-8")
      )
    );
    ```
    -> 0xb94732ef4516b046ed30cf52af2e344e1f87f538e7af164ac66ef0b166be4461

    Mapping:

    __$b94732ef4516b046ed30cf52af2e344e1f$__ = "contracts/ledger-sc-registry/SchemaLib.sol:SchemaLib"
    __$515a15b27d7e720e4d91814eed9672e50c$__ = "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination"
  */

  const schemasRegistry = await new SchemaSCRegistry__factory(
    {
      __$b94732ef4516b046ed30cf52af2e344e1f$__: schemaLibAddress,
      __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
    },
    owner
  ).deploy();

  return schemasRegistry;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.Web3Provider;
  schemasRegistryContract: SchemaSCRegistry;
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const schemasRegistryContract = await deployLedgerScRegistryContract(
    ethersProvider
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    schemasRegistryContract,
  };
}
