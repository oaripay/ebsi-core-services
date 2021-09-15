import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { Tir } from "../../src/contracts";
import { createDid } from "./data";

interface Administrator {
  wallet: ethers.Wallet;
  attribute: { [x: string]: unknown };
  did: string;
}

interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
}

interface IssuerObject {
  did: string;
  attributeData: Buffer;
}

export async function deployTirContract(): Promise<Tir> {
  // Deploy libs
  const paginationFactory = await hre.ethers.getContractFactory("Pagination");
  const pagination = await paginationFactory.deploy();

  const tirFactory = await hre.ethers.getContractFactory("Tir", {
    libraries: {
      Pagination: pagination.address,
    },
  });
  const tirContract = await tirFactory.deploy();
  await tirContract.initialize(1);

  return tirContract;
}

export async function insertAdmin(
  contract: Tir,
  adminDid: string
): Promise<{ [x: string]: unknown }> {
  const attribute = {
    "@context": {
      name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
      description: "http://tir-api-test.org/description",
    },
    name: `test-${adminDid}`,
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 4e8).toISOString(),
  };

  const bufferAttribute = Buffer.from(JSON.stringify(attribute));

  await contract.insertAdministrator(adminDid.toLowerCase(), bufferAttribute);

  return attribute;
}

export async function insertIssuer(contract: Tir): Promise<IssuerObject> {
  const issuerDid = createDid();
  const bufferAttribute = Buffer.from(
    JSON.stringify({
      "@context": {
        name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
        description: "http://tir-api-test.org/description",
      },
      name: `test-${issuerDid}`,
    })
  );

  await contract.insertIssuer(issuerDid.toLowerCase(), bufferAttribute);

  return {
    did: issuerDid,
    attributeData: bufferAttribute,
  };
}

export async function insertPolicy(contract: Tir): Promise<PolicyObject> {
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
  contract: Tir,
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

export interface SetupOptions {
  administratorsTotal?: number;
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  issuersTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    administratorsTotal: 1,
    policiesTotal: 0,
    policiesRevisionsTotal: 1,
    issuersTotal: 0,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  tirContract: Tir;
  administrators: Administrator[];
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
  issuers: IssuerObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const tirContract = await deployTirContract();

  // Insert fake data

  // Create as many admins as requested
  const createAdminWallet = async () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    const did = createDid();
    const attribute = await insertAdmin(tirContract, did);
    return { wallet, attribute, did };
  };

  const administrators = await range(0, opts.administratorsTotal)
    .pipe(mergeMap(createAdminWallet), toArray())
    .toPromise();

  const policyRevisions = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(tirContract);

    const createRevision = async () =>
      updatePolicy(tirContract, policy.policyId);

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

  // Create as many issuers as requested
  const createIssuer = async () => insertIssuer(tirContract);

  const issuers = await range(0, opts.issuersTotal)
    .pipe(mergeMap(createIssuer), toArray())
    .toPromise();

  // Return test env variables
  return {
    provider: ethersProvider,
    tirContract,
    administrators,
    policies,
    policyRevisions,
    issuers,
  };
}
