import crypto from "crypto";
import { ethers } from "ethers";
import ganache from "ganache-core";
import {
  Tar,
  Tar__factory,
  AppLib__factory,
  AuthLib__factory,
  PolicyLib__factory,
  AdminLib__factory,
  RevocationLib__factory,
} from "../../src/contracts";
// Pagination Lib is ignored by TypeChain...
import {
  abi,
  bytecode,
} from "../../submodules/trusted-apps-registry-ethereum-sc/build/contracts/Pagination.json";

interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
}

export async function deployTarContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<Tar> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const paginationFactory = new ethers.ContractFactory(abi, bytecode, owner);
  const paginationAddress = (await paginationFactory.deploy()).address;

  const appLibAddress = (
    await new AppLib__factory(
      {
        __Pagination____________________________: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const authLibAddress = (await new AuthLib__factory(owner).deploy()).address;
  const policyLibAddress = (
    await new PolicyLib__factory(
      {
        __Pagination____________________________: paginationAddress,
      },
      owner
    ).deploy()
  ).address;
  const adminLibAddress = (
    await new AdminLib__factory(
      {
        __Pagination____________________________: paginationAddress,
      },
      owner
    ).deploy()
  ).address;
  const revocationLibAddress = (
    await new RevocationLib__factory(owner).deploy()
  ).address;

  const tarContract = await new Tar__factory(
    {
      __AppLib________________________________: appLibAddress,
      __AuthLib_______________________________: authLibAddress,
      __PolicyLib_____________________________: policyLibAddress,
      __AdminLib______________________________: adminLibAddress,
      __RevocationLib_________________________: revocationLibAddress,
    },
    owner
  ).deploy();

  return tarContract;
}

export async function insertAdmin(
  contract: Tar,
  adminAddress: string
): Promise<ethers.ContractTransaction> {
  const adminDid = `did:ebsi:${adminAddress.toLowerCase()}`;
  const bufferAttribute = Buffer.from(
    JSON.stringify({
      "@context": {
        name: { "@id": "http://tar-api-test.org/name", "@type": "@id" },
        description: "http://tar-api-test.org/description",
      },
      name: `test-${adminDid}`,
    })
  );

  return contract.insertAdministrator(adminDid, bufferAttribute);
}

export async function insertPolicy(contract: Tar): Promise<PolicyObject> {
  const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;

  const policyData = {
    // any object here
    any: "Any attribute here",
    type: "credential",
    data: crypto.randomBytes(16).toString("hex"),
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.utils.sha256(policyBuffer);

  await contract.insertPolicy(policyId, policyBuffer);

  return { policyId, policyData: policyBuffer.toString("base64"), policyHash };
}

export interface SetupOptions {
  administratorsTotal?: number;
  policiesTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    administratorsTotal: 1,
    policiesTotal: 0,
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  tarContract: Tar;
  administrators: ethers.Wallet[];
  policies: PolicyObject[];
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const tarContract = await deployTarContract(ethersProvider);

  // Insert fake data

  // Create as many admins as requested
  const administrators = await Promise.all(
    Array(opts.administratorsTotal)
      .fill("")
      .map(async () => {
        // Create random wallet and connect it so we can use it later to send transactions
        const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
        await insertAdmin(tarContract, wallet.address);
        return wallet;
      })
  );

  // Create as many policies as requested
  const policies = await Promise.all(
    Array(opts.policiesTotal)
      .fill("")
      .map(async () => insertPolicy(tarContract))
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    tarContract,
    administrators,
    policies,
  };
}
