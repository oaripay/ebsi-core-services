import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "crypto";
import { Contract, ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Tir } from "../../src/contracts";

interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
}

interface IssuerObject {
  did: string;
  attributeData: Buffer;
}

export async function deployTirContract(): Promise<{
  tirContract: Tir;
  policyContractMock: Contract;
  didContractMock: Contract;
}> {
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
  await tirContract.setRegistryAddresses();

  return { tirContract, didContractMock, policyContractMock };
}

export async function insertIssuer(contract: Tir): Promise<IssuerObject> {
  const issuerDid = EbsiWallet.createDid();
  const bufferAttribute = Buffer.from(
    JSON.stringify({
      "@context": {
        name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
        description: "http://tir-api-test.org/description",
      },
      name: `test-${issuerDid}`,
    })
  );

  await contract.insertIssuer(issuerDid, bufferAttribute);

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
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  issuersTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    policiesTotal: 0,
    issuersTotal: 0,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  tirContract: Tir;
  policyContractMock: Contract;
  didContractMock: Contract;
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
  issuers: IssuerObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { tirContract, policyContractMock, didContractMock } =
    await deployTirContract();

  // Insert fake data

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
    policyContractMock,
    didContractMock,
    policies,
    policyRevisions,
    issuers,
  };
}
