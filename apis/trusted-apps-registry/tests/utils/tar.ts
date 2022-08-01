import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { FactoryOptions } from "hardhat/types";
import crypto from "crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Tar } from "@ebsiint-sc/trusted-apps-registry";

interface User {
  wallet: ethers.Wallet;
  did: string;
}

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
  applicationId: string;
  info: {
    [x: string]: unknown;
  };
}

interface AuthorizationObject {
  name: string;
  authorizedAppName: string;
  iss: string;
  status: number;
  permissions: number;
  notBefore: number;
  notAfter: number;
}

const deployContract = async (
  name: string,
  opts: FactoryOptions = {}
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployTarContract(): Promise<Tar> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const testDidrAddress = "0xf6080028519B49D94C846bd34e30f72586E3F5d5";

  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistryMock"
  );
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);
  await policyContractMock.setPolicyResult(true);

  const didRegistryFactory = await hre.ethers.getContractFactory(
    "DidRegistryMock"
  );
  const tempDidContract = await didRegistryFactory.deploy();
  await tempDidContract.deployed();
  const bytecodeDid = await hre.ethers.provider.getCode(
    tempDidContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testDidrAddress,
    bytecodeDid,
  ]);
  const didContractMock = didRegistryFactory.attach(testDidrAddress);
  await didContractMock.setDidResult(true);

  const paginationAddress = await deployContract("Pagination");

  const linkLibPagination = {
    libraries: {
      Pagination: paginationAddress,
    },
  };

  const tarFactory = await hre.ethers.getContractFactory("Tar", {
    libraries: {
      AppLib: await deployContract("AppLib", linkLibPagination),
      AuthLib: await deployContract("AuthLib"),
      TarPolicyLib: await deployContract("TarPolicyLib", linkLibPagination),
      RevocationLib: await deployContract("RevocationLib"),
    },
  });

  const tarContract = await tarFactory.deploy();
  await tarContract.initialize(1);
  await tarContract.setRegistryAddresses();

  return tarContract;
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
  const appAdministrator = EbsiWallet.createDid();
  const publicKey = `pubkey-${crypto.randomBytes(8).toString("hex")}`;
  const applicationId = ethers.utils.sha256(ethers.utils.toUtf8Bytes(name));
  const status = 1; // "active"
  const notBefore = Date.now();
  const notAfter = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const info = {
    someNumber: Date.now(),
    someString: crypto.randomBytes(12).toString("hex"),
    someObject: {
      x: "x",
      one: 1,
    },
  };

  const bufferPublicKey = Buffer.from(publicKey, "utf8");
  const bufferInfo = Buffer.from(JSON.stringify(info), "utf8");

  await contract.insertApp(name, domain, appAdministrator);

  await contract.insertAppPublicKey(
    applicationId,
    bufferPublicKey,
    status,
    notBefore,
    notAfter
  );

  await contract.insertAppInfo(applicationId, bufferInfo);

  return {
    name,
    domain,
    appAdministrator,
    publicKey,
    status,
    notBefore,
    notAfter,
    applicationId,
    info,
  };
}

export async function insertAuthorization(
  contract: Tar,
  name: string,
  authorizedAppName: string
): Promise<AuthorizationObject> {
  const iss = EbsiWallet.createDid();
  const status = 1; // "active"
  const permissions = 4; // "0100" read only
  const notBefore = Date.now();
  const notAfter = Date.now() + 365 * 24 * 60 * 60 * 1000;
  await contract.insertAuthorization(
    name,
    authorizedAppName,
    iss,
    status,
    permissions,
    notBefore,
    notAfter
  );

  return {
    name,
    authorizedAppName,
    iss,
    status,
    permissions,
    notBefore,
    notAfter,
  };
}

export interface SetupOptions {
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  appsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    policiesTotal: 0,
    policiesRevisionsTotal: 1,
    appsTotal: 0,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  tarContract: Tar;
  user: User;
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
  apps: AppObject[];
  authorizations: [AuthorizationObject, AuthorizationObject][][];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const tarContract = await deployTarContract();

  // Insert fake data
  const createWallet = () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    const did = EbsiWallet.createDid();
    return { wallet, did };
  };

  const user = createWallet();

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

  const authorizations = [];
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < apps.length; i += 1) {
    const authsApp = [];
    for (let j = 0; j < apps.length; j += 1) {
      const auth1 = await insertAuthorization(
        tarContract,
        apps[i].name,
        apps[j].name
      );
      const auth2 = await insertAuthorization(
        tarContract,
        apps[i].name,
        apps[j].name
      );
      authsApp.push([auth1, auth2]);
    }
    authorizations.push(authsApp);
  }
  /* eslint-enable no-await-in-loop */

  // Return test env variables
  return {
    provider: ethersProvider,
    tarContract,
    user,
    policies,
    policyRevisions,
    apps,
    authorizations,
  };
}
