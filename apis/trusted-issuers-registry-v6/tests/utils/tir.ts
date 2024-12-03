import "../../../../contracts/trusted-issuers-registry-v4/src/types/hardhat.d.ts";

import hre from "hardhat";

import "@nomiclabs/hardhat-ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { StatusList2021Credential } from "@ebsiint-api/shared";
import { TrustedIssuersRegistry } from "@ebsiint-sc/trusted-issuers-registry-v4";
import { Contract, ethers } from "ethers";
import crypto from "node:crypto";

import {
  IssuerType,
  IssuerTypeNames,
} from "../../src/modules/issuers/issuers.constants.js";
import { dummyIssuers, IssuerGraphObject } from "./data.js";

export interface IssuerObject {
  attribute: {
    buffer: Buffer;
    hex: string;
    id: string;
    lastRevisionId: string;
    utf8: string;
  };
  attributeIdTao: string;
  did: string;
  issuerType: IssuerType;
  proxy: {
    id: string;
    obj: IssuerProxyObject;
    statusList2021Credential: StatusList2021Credential;
    utf8: string;
  };
  rootTao: string;
  tao: string;
}

export interface IssuerProxyObject {
  headers: Record<string, boolean | number | string>;
  prefix: string;
  testSuffix: string;
}

export function createIssuer(
  issuerType: IssuerType,
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
  const attributeId = ethers.utils.sha256(attributeBuffer);
  const attribute = {
    buffer: attributeBuffer,
    hex: attributeHex,
    id: attributeId,
    lastRevisionId: attributeId,
    utf8: attributeUtf8,
  };

  let taoDid: string;
  let rootTao: string;
  let attributeIdTao: string;

  if (issuerType === IssuerType.RootTAO) {
    rootTao = issuerDid;
    taoDid = issuerDid;
    attributeIdTao = `0x${"0".repeat(64)}`;
  } else {
    rootTao = inputRootTaoDid!;
    taoDid = inputTaoDid!;
    attributeIdTao = inputTaoAttributeId!;
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
  const proxyId = ethers.utils.sha256(Buffer.from(proxyUtf8));
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
    attributeIdTao,
    did: issuerDid,
    issuerType,
    proxy,
    rootTao,
    tao: taoDid,
  };
}

export async function deployTirContract(): Promise<{
  didContractMock: Contract;
  policyContractMock: Contract;
  tirContract: TrustedIssuersRegistry;
}> {
  const [upgrader] = await hre.ethers.getSigners();

  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const testDidrAddress = "0xDBf25173FC2b2e52a9B6fa54F6180136034800a8";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");

  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address,
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);
  await policyContractMock.setPolicyResult(true);

  const didRegistryFactory =
    await hre.ethers.getContractFactory("DidRegistryMock");
  const tempDidContract = await didRegistryFactory.deploy();
  await tempDidContract.deployed();
  const bytecodeDid = await hre.ethers.provider.getCode(
    tempDidContract.address,
  );
  await hre.network.provider.send("hardhat_setCode", [
    testDidrAddress,
    bytecodeDid,
  ]);
  const didContractMock = didRegistryFactory.attach(testDidrAddress);
  await didContractMock.setDidResult(true);

  const tirFactory = await hre.ethers.getContractFactory(
    "TrustedIssuersRegistry",
  );
  const tirContract = (await hre.upgrades.deployProxy(
    tirFactory,
    [upgrader!.address, testTprAddress, testDidrAddress],
    { unsafeAllowLinkedLibraries: true },
  )) as unknown as TrustedIssuersRegistry;

  return {
    didContractMock,
    policyContractMock,
    tirContract,
  };
}

export async function insertIssuer(
  contract: TrustedIssuersRegistry,
  issuer: IssuerGraphObject,
  inputTaoAttributeId: string,
) {
  await contract.setAttributeMetadata(
    issuer.id,
    issuer.attributes[0]!.id,
    IssuerTypeNames.indexOf(issuer.attributes[0]!.lastRevision.issuerType),
    issuer.attributes[0]!.lastRevision.tao,
    inputTaoAttributeId,
  );

  await contract.setAttributeData(
    issuer.id,
    issuer.attributes[0]!.id,
    Buffer.from(issuer.attributes[0]!.lastRevision.data),
  );

  await contract.addIssuerProxy(issuer.id, issuer.proxies[0]!.data);
}

export async function setupTestEnv(): Promise<{
  didContractMock: Contract;
  issuers: IssuerObject[];
  provider: ethers.providers.JsonRpcProvider;
  tirContract: TrustedIssuersRegistry;
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { didContractMock, tirContract } = await deployTirContract();

  // create a Root TAO
  const rootTao = dummyIssuers[0]!;
  await insertIssuer(tirContract, rootTao, rootTao.attributes[0]!.id);

  // create TAO
  const tao = dummyIssuers[1]!;
  await insertIssuer(tirContract, tao, rootTao.attributes[0]!.id);

  // Return test env variables
  return {
    didContractMock,
    issuers: dummyIssuers.map((i) => {
      const proxyObject = JSON.parse(i.proxies[0]!.data) as IssuerProxyObject;
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
        issuer: i.id,
        type: [
          "VerifiableCredential",
          "VerifiableAttestation",
          "StatusList2021Credential",
        ],
        validFrom: "2021-04-05T14:27:40Z",
      };

      const attributeIdTao =
        i.id === rootTao.id || i.id === tao.id
          ? rootTao.attributes[0]!.id
          : tao.attributes[0]!.id;

      return {
        attribute: {
          buffer: Buffer.from(i.attributes[0]!.lastRevision.data),
          hex: `0x${Buffer.from(i.attributes[0]!.lastRevision.data).toString("hex")}`,
          id: i.attributes[0]!.id,
          lastRevisionId: i.attributes[0]!.lastRevision.id,
          utf8: i.attributes[0]!.lastRevision.data,
        },
        attributeIdTao,
        did: i.id,
        issuerType: IssuerTypeNames.indexOf(
          i.attributes[0]!.lastRevision.issuerType,
        ),
        proxy: {
          id: i.proxies[0]!.id,
          obj: proxyObject,
          statusList2021Credential,
          utf8: i.proxies[0]!.data,
        },
        rootTao: i.attributes[0]!.lastRevision.rootTao,
        tao: i.attributes[0]!.lastRevision.tao,
      };
    }),
    provider: ethersProvider,
    tirContract,
  };
}
