import crypto from "crypto";
import { ethers } from "ethers";
import ganache from "ganache-core";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
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

interface AppObject {
  name: string;
  domain: number;
  appAdministrator: string;
  publicKey: string;
  status: number;
  notBefore: number;
  notAfter: number;
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

export async function updatePolicy(
  contract: Tar,
  policyId: string
): Promise<PolicyObject> {
  const policyData = {
    // any object here
    any: "Any attribute here",
    type: "credential",
    data: crypto.randomBytes(16).toString("hex"),
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.utils.sha256(policyBuffer);

  await contract.updatePolicy(policyId, policyBuffer);

  return { policyId, policyData: policyBuffer.toString("base64"), policyHash };
}

export async function insertApp(contract: Tar): Promise<AppObject> {
  const name = `app-${crypto.randomBytes(8).toString("hex")}`;
  const domain = 0; // "ebsi"
  const appAdministrator = "did:ebsi:0x001F";
  const publicKey = `pubkey-${crypto.randomBytes(8).toString("hex")}`;
  const status = 0; // "active"
  const notBefore = Date.now();
  const notAfter = Date.now() + 365 * 24 * 60 * 60 * 1000;

  const bufferPublicKey = Buffer.from(publicKey, "utf8");

  await contract.insertApp(
    name,
    domain,
    appAdministrator,
    bufferPublicKey,
    status,
    notBefore,
    notAfter
  );

  return {
    name,
    domain,
    appAdministrator,
    publicKey,
    status,
    notBefore,
    notAfter,
  };
}

export interface SetupOptions {
  administratorsTotal?: number;
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  appsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    administratorsTotal: 1,
    policiesTotal: 0,
    policiesRevisionsTotal: 1,
    appsTotal: 0,
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  tarContract: Tar;
  administrators: ethers.Wallet[];
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
  apps: AppObject[];
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const tarContract = await deployTarContract(ethersProvider);

  // Insert fake data

  // Create as many admins as requested
  const createAdminWallet = async () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    await insertAdmin(tarContract, wallet.address);
    return wallet;
  };

  const administrators = await range(0, opts.administratorsTotal)
    .pipe(mergeMap(createAdminWallet), toArray())
    .toPromise();

  const policyRevisions = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(tarContract);

    const createRevision = async () =>
      updatePolicy(tarContract, policy.policyId);

    // For each policy, add revisions
    policyRevisions[policy.policyId] = [
      // The first revision is the policy itself
      policy,
      // Then, we add new revisions
      ...(await range(0, opts.policiesRevisionsTotal - 1)
        .pipe(mergeMap(createRevision), toArray())
        .toPromise()),
    ];

    return policy;
  };

  const policies =
    opts.policiesRevisionsTotal >= 1
      ? await range(0, opts.policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise()
      : [];

  // Create as many apps as requested
  const createApp = async () => insertApp(tarContract);

  const apps = await range(0, opts.appsTotal)
    .pipe(mergeMap(createApp), toArray())
    .toPromise();

  // Return test env variables
  return {
    provider: ethersProvider,
    tarContract,
    administrators,
    policies,
    policyRevisions,
    apps,
  };
}
