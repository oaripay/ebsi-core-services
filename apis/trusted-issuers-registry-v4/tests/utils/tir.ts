// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-issuers-registry/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { Contract, ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import { StatusList2021Credential } from "@ebsiint-api/shared";
import { IssuerType } from "../../src/modules/issuers/issuers.interface";

interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
}

export interface IssuerProxyObject {
  prefix: string;
  headers: Record<string, string | number | boolean>;
  testSuffix: string;
}

export interface IssuerObject {
  did: string;
  issuerType: IssuerType;
  attribute: {
    id: string;
    hex: string;
    buffer: Buffer;
    utf8: string;
  };
  rootTao: string;
  tao: string;
  taoAttributeId: string;
  proxy: {
    id: string;
    obj: IssuerProxyObject;
    utf8: string;
    statusList2021Credential: StatusList2021Credential;
  };
}

export async function deployTirContract(): Promise<{
  tirContract: Tir;
  policyContractMock: Contract;
  didContractMock: Contract;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const testDidrAddress = "0xDBf25173FC2b2e52a9B6fa54F6180136034800a8";
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
  const tirContract = await tirFactory.deploy(testTprAddress, testDidrAddress);
  await tirContract.initialize(1);
  await tirContract.setRegistryAddresses();

  return {
    tirContract,
    didContractMock,
    policyContractMock,
  };
}

export function createIssuer(
  issuerType: IssuerType,
  inputTaoDid?: string,
  inputtaoAttributeId?: string,
  inputRootTaoDid?: string
): IssuerObject {
  const issuerDid = EbsiWallet.createDid();
  const attributeUtf8 = JSON.stringify({
    "@context": {
      name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
      description: "http://tir-api-test.org/description",
    },
    name: `test-${issuerDid}`,
  });
  const attributeBuffer = Buffer.from(attributeUtf8);
  const attributeHex = `0x${attributeBuffer.toString("hex")}`;
  const attributeId = ethers.utils.sha256(attributeBuffer);
  const attribute = {
    hex: attributeHex,
    buffer: attributeBuffer,
    utf8: attributeUtf8,
    id: attributeId,
  };

  let taoDid: string;
  let rootTao: string;
  let taoAttributeId: string;
  if (issuerType === IssuerType.RootTAO) {
    rootTao = issuerDid;
    taoDid = issuerDid;
    taoAttributeId = `0x${"0".repeat(64)}`;
  } else {
    rootTao = inputRootTaoDid;
    taoDid = inputTaoDid;
    taoAttributeId = inputtaoAttributeId;
  }

  // create proxy
  const proxyObject: IssuerProxyObject = {
    prefix: "https://example.net",
    headers: {
      Authorization: `Bearer ${crypto.randomBytes(16).toString("hex")}`,
    },
    testSuffix: "/cred/1",
  };
  const proxyUtf8 = JSON.stringify(proxyObject);
  const proxyId = ethers.utils.sha256(Buffer.from(proxyUtf8));
  const statusList2021Credential: StatusList2021Credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    id: `${proxyObject.prefix}${proxyObject.testSuffix}`,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: issuerDid,
    issued: "2021-04-05T14:27:40Z",
    issuanceDate: "2021-04-05T14:27:40Z",
    validFrom: "2021-04-05T14:27:40Z",
    credentialSubject: {
      id: `${proxyObject.prefix}${proxyObject.testSuffix}#list`,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList:
        "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
    },
    credentialSchema: {
      id: "https://example.net",
      type: "FullJsonSchemaValidator2021",
    },
  };

  const proxy = {
    obj: proxyObject,
    utf8: proxyUtf8,
    id: proxyId,
    statusList2021Credential,
  };

  return {
    did: issuerDid,
    issuerType,
    attribute,
    rootTao,
    tao: taoDid,
    taoAttributeId,
    proxy,
  };
}

export async function insertIssuer(
  contract: Tir,
  issuerType: IssuerType,
  inputTaoDid?: string,
  inputtaoAttributeId?: string,
  inputRootTaoDid?: string
): Promise<IssuerObject> {
  const issuer = createIssuer(
    issuerType,
    inputTaoDid,
    inputtaoAttributeId,
    inputRootTaoDid
  );
  await contract.insertIssuer(
    issuer.did,
    issuer.attribute.buffer,
    issuer.issuerType,
    issuer.tao,
    issuer.taoAttributeId
  );
  await contract.addIssuerProxy(issuer.did, issuer.proxy.utf8);
  return issuer;
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

  const issuers: IssuerObject[] = [];

  // create a Root TAO
  const rootTao = await insertIssuer(tirContract, IssuerType.RootTAO);
  issuers.push(rootTao);

  // create TAOs
  const tao1 = await insertIssuer(
    tirContract,
    IssuerType.TAO,
    rootTao.did,
    rootTao.attribute.id,
    rootTao.did
  );
  const tao2 = await insertIssuer(
    tirContract,
    IssuerType.TAO,
    rootTao.did,
    rootTao.attribute.id,
    rootTao.did
  );
  issuers.push(tao1, tao2);

  // create TIs
  const insertIssuerAsTI = async () =>
    insertIssuer(
      tirContract,
      IssuerType.TI,
      tao1.did,
      tao1.attribute.id,
      rootTao.did
    );

  // Create as many issuers as requested
  issuers.push(
    ...(await range(0, opts.issuersTotal - 3)
      .pipe(mergeMap(insertIssuerAsTI), toArray())
      .toPromise())
  );

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
