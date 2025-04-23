import "@ebsiint-sc/trusted-issuers-registry/dist/hardhat.d.ts";

import hre from "hardhat";

import type { StatusList2021Credential } from "@ebsiint-api/shared";
import type {
  DidRegistryMock,
  PolicyRegistryMock,
  Tir,
} from "@ebsiint-sc/trusted-issuers-registry";
import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import "@nomicfoundation/hardhat-ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import crypto from "node:crypto";

import { IssuerType } from "../../src/modules/issuers/issuers.constants.ts";

export interface IssuerObject {
  attribute: {
    buffer: Buffer;
    hex: string;
    id: string;
    utf8: string;
  };
  did: string;
  issuerType: (typeof IssuerType)[keyof typeof IssuerType];
  proxy: {
    id: string;
    obj: IssuerProxyObject;
    statusList2021Credential: StatusList2021Credential;
    utf8: string;
  };
  rootTao: string;
  tao: string;
  taoAttributeId: string;
}

export interface IssuerProxyObject {
  headers: Record<string, boolean | number | string>;
  prefix: string;
  testSuffix: string;
}

export interface SetupOptions {
  issuersTotal?: number;
}

export function createIssuer(
  issuerType: (typeof IssuerType)[keyof typeof IssuerType],
  inputTaoDid?: string,
  inputTaoAttributeId?: string,
  inputRootTaoDid?: string,
): IssuerObject {
  const issuerDid = EbsiWallet.createDid();
  const attributeUtf8 = JSON.stringify({
    "@context": {
      description: "http://tir-api-test.org/description",
      name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
    },
    name: `test-${issuerDid}`,
  });
  const attributeBuffer = Buffer.from(attributeUtf8);
  const attributeHex = `0x${attributeBuffer.toString("hex")}`;
  const attributeId = ethers.sha256(attributeBuffer);
  const attribute = {
    buffer: attributeBuffer,
    hex: attributeHex,
    id: attributeId,
    utf8: attributeUtf8,
  };

  let taoDid: string;
  let rootTao: string;
  let taoAttributeId: string;

  if (issuerType === IssuerType.RootTAO) {
    rootTao = issuerDid;
    taoDid = issuerDid;
    taoAttributeId = `0x${"0".repeat(64)}`;
  } else {
    rootTao = inputRootTaoDid!;
    taoDid = inputTaoDid!;
    taoAttributeId = inputTaoAttributeId!;
  }

  // create proxy
  const proxyObject: IssuerProxyObject = {
    headers: {
      Authorization: `Bearer ${crypto.randomBytes(16).toString("hex")}`,
    },
    prefix: "https://example.net",
    testSuffix: "/cred/1",
  };
  const proxyUtf8 = JSON.stringify(proxyObject);
  const proxyId = ethers.sha256(Buffer.from(proxyUtf8));
  const statusList2021Credential: StatusList2021Credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    credentialSchema: {
      id: "https://example.net",
      type: "FullJsonSchemaValidator2021",
    },
    credentialSubject: {
      encodedList:
        "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
      id: `${proxyObject.prefix}${proxyObject.testSuffix}#list`,
      statusPurpose: "revocation",
      type: "StatusList2021",
    },
    id: `${proxyObject.prefix}${proxyObject.testSuffix}`,
    issuanceDate: "2021-04-05T14:27:40Z",
    issued: "2021-04-05T14:27:40Z",
    issuer: issuerDid,
    type: [
      "VerifiableCredential",
      "VerifiableAttestation",
      "StatusList2021Credential",
    ],
    validFrom: "2021-04-05T14:27:40Z",
  };

  const proxy = {
    id: proxyId,
    obj: proxyObject,
    statusList2021Credential,
    utf8: proxyUtf8,
  };

  return {
    attribute,
    did: issuerDid,
    issuerType,
    proxy,
    rootTao,
    tao: taoDid,
    taoAttributeId,
  };
}

export async function deployTirContract(): Promise<{
  didContractMock: DidRegistryMock;
  policyContractMock: PolicyRegistryMock;
  tirContract: Tir;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const testDidrAddress = "0xDBf25173FC2b2e52a9B6fa54F6180136034800a8";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");

  const tempPolicyContract = await policyRegistryFactory.deploy();

  const bytecode = await hre.ethers.provider.getCode(
    await tempPolicyContract.getAddress(),
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(
    testTprAddress,
  ) as PolicyRegistryMock;
  await policyContractMock.setPolicyResult(true);

  const didRegistryFactory =
    await hre.ethers.getContractFactory("DidRegistryMock");
  const tempDidContract = await didRegistryFactory.deploy();
  await tempDidContract.waitForDeployment();
  const bytecodeDid = await hre.ethers.provider.getCode(
    await tempDidContract.getAddress(),
  );
  await hre.network.provider.send("hardhat_setCode", [
    testDidrAddress,
    bytecodeDid,
  ]);
  const didContractMock = didRegistryFactory.attach(
    testDidrAddress,
  ) as DidRegistryMock;
  await didContractMock.setDidResult(true);

  // Deploy libs
  const paginationFactory = await hre.ethers.getContractFactory("Pagination");
  const pagination = await paginationFactory.deploy();

  const tirFactory = await hre.ethers.getContractFactory("Tir", {
    libraries: {
      Pagination: await pagination.getAddress(),
    },
  });
  const tirContract = await tirFactory.deploy(testTprAddress, testDidrAddress);
  await tirContract.initialize(1);
  await tirContract.setRegistryAddresses();

  return {
    didContractMock,
    policyContractMock,
    tirContract,
  };
}

export async function insertIssuer(
  contract: Tir,
  issuerType: (typeof IssuerType)[keyof typeof IssuerType],
  inputTaoDid?: string,
  inputTaoAttributeId?: string,
  inputRootTaoDid?: string,
): Promise<IssuerObject> {
  const issuer = createIssuer(
    issuerType,
    inputTaoDid,
    inputTaoAttributeId,
    inputRootTaoDid,
  );

  const firstAttributeId = crypto.randomBytes(32);

  await contract.setAttributeMetadata(
    issuer.did,
    firstAttributeId,
    issuer.issuerType,
    issuer.tao,
    issuer.taoAttributeId,
  );

  await contract.setAttributeData(
    issuer.did,
    firstAttributeId,
    issuer.attribute.buffer,
  );

  await contract.addIssuerProxy(issuer.did, issuer.proxy.utf8);
  return issuer;
}

export async function setupTestEnv({
  issuersTotal = 0,
}: SetupOptions = {}): Promise<{
  didContractMock: DidRegistryMock;
  issuers: IssuerObject[];
  provider: HardhatEthersProvider;
  tirContract: Tir;
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { didContractMock, tirContract } = await deployTirContract();

  // Insert fake data
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
    rootTao.did,
  );
  const tao2 = await insertIssuer(
    tirContract,
    IssuerType.TAO,
    rootTao.did,
    rootTao.attribute.id,
    rootTao.did,
  );
  issuers.push(tao1, tao2);

  // create TIs
  const insertIssuerAsTI = async () =>
    insertIssuer(
      tirContract,
      IssuerType.TI,
      tao1.did,
      tao1.attribute.id,
      rootTao.did,
    );

  // Create as many issuers as requested
  for (let i = 0; i < issuersTotal - 3; i++) {
    issuers.push(await insertIssuerAsTI());
  }

  // Return test env variables
  return {
    didContractMock,
    issuers,
    provider: ethersProvider,
    tirContract,
  };
}
