// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-issuers-registry-v4/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { Contract, ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { TrustedIssuersRegistry } from "@ebsiint-sc/trusted-issuers-registry-v4";
import { StatusList2021Credential } from "@ebsiint-api/shared";
import {
  IssuerType,
  IssuerTypeNames,
} from "../../src/modules/issuers/issuers.constants.js";
import { dummyIssuers, IssuerGraphObject } from "./data.js";

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
    lastRevisionId: string;
    hex: string;
    buffer: Buffer;
    utf8: string;
  };
  rootTao: string;
  tao: string;
  attributeIdTao: string;
  proxy: {
    id: string;
    obj: IssuerProxyObject;
    utf8: string;
    statusList2021Credential: StatusList2021Credential;
  };
}

export async function deployTirContract(): Promise<{
  tirContract: TrustedIssuersRegistry;
  policyContractMock: Contract;
  didContractMock: Contract;
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
    tirContract,
    didContractMock,
    policyContractMock,
  };
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
    lastRevisionId: attributeId,
  };

  let taoDid: string;
  let rootTao: string;
  let attributeIdTao: string;

  if (issuerType === IssuerType.RootTAO) {
    rootTao = issuerDid;
    taoDid = issuerDid;
    attributeIdTao = `0x${"0".repeat(64)}`;
  } else {
    rootTao = inputRootTaoDid as string;
    taoDid = inputTaoDid as string;
    attributeIdTao = inputTaoAttributeId as string;
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
    type: [
      "VerifiableCredential",
      "VerifiableAttestation",
      "StatusList2021Credential",
    ],
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
    attributeIdTao,
    proxy,
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
    IssuerTypeNames.findIndex(
      (t) => t === issuer.attributes[0]!.lastRevision.issuerType,
    ),
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
  provider: ethers.providers.JsonRpcProvider;
  tirContract: TrustedIssuersRegistry;
  didContractMock: Contract;
  issuers: IssuerObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { tirContract, didContractMock } = await deployTirContract();

  // create a Root TAO
  const rootTao = dummyIssuers[0]!;
  await insertIssuer(tirContract, rootTao, rootTao.attributes[0]!.id);

  // create TAO
  const tao = dummyIssuers[1]!;
  await insertIssuer(tirContract, tao, rootTao.attributes[0]!.id);

  // Return test env variables
  return {
    provider: ethersProvider,
    tirContract,
    didContractMock,
    issuers: dummyIssuers.map((i) => {
      const proxyObject = JSON.parse(i.proxies[0]!.data) as IssuerProxyObject;
      const statusList2021Credential: StatusList2021Credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/vc/status-list/2021/v1",
        ],
        id: `${proxyObject.prefix}${proxyObject.testSuffix}`,
        type: [
          "VerifiableCredential",
          "VerifiableAttestation",
          "StatusList2021Credential",
        ],
        issuer: i.id,
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

      let attributeIdTao: string;
      if (i.id === rootTao.id || i.id === tao.id) {
        attributeIdTao = rootTao.attributes[0]!.id;
      } else {
        attributeIdTao = tao.attributes[0]!.id;
      }

      return {
        did: i.id,
        issuerType: IssuerTypeNames.findIndex(
          (n) => n === i.attributes[0]!.lastRevision.issuerType,
        ),
        attribute: {
          id: i.attributes[0]!.id,
          lastRevisionId: i.attributes[0]!.lastRevision.id,
          hex: `0x${Buffer.from(i.attributes[0]!.lastRevision.data).toString("hex")}`,
          buffer: Buffer.from(i.attributes[0]!.lastRevision.data),
          utf8: i.attributes[0]!.lastRevision.data,
        },
        rootTao: i.attributes[0]!.lastRevision.rootTao,
        tao: i.attributes[0]!.lastRevision.tao,
        attributeIdTao,
        proxy: {
          id: i.proxies[0]!.id,
          obj: proxyObject,
          utf8: i.proxies[0]!.data,
          statusList2021Credential,
        },
      };
    }),
  };
}
