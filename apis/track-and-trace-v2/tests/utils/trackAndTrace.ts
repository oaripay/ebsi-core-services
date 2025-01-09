import "../../../../contracts/track-and-trace-v2/src/types/hardhat.d.ts";

import hre from "hardhat";

import "@nomicfoundation/hardhat-ethers";

import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers.js";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace-v2";

import { Document, Operator } from "../../.graphclient/index.js";
import { AccountType, Permission } from "../../src/shared/constants.js";
import { didToHex, hexToDid } from "../../src/shared/utils.js";
import {
  createDocument,
  createEvent,
  dummyData,
  type TestDocument,
} from "./data.js";

export interface SetupOptions {
  documentEventsTotal?: number;
  documentsWithBlockSourceTotal?: number;
  documentsWithExternalSourceTotal?: number;
}

export async function addEvent(contract: TrackAndTrace, doc: TestDocument) {
  const event = createEvent(doc.documentHash, doc.didEbsiCreator);

  const tx = await contract["writeEvent((bytes32,string,bytes,string,string))"](
    {
      documentHash: event.documentHash,
      externalHash: event.externalHash,
      metadata: event.metadata,
      origin: event.origin,
      sender: await didToHex(event.sender),
    },
  );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const block = await hre.ethers.provider.getBlock(receipt.blockHash);

  if (!block) {
    throw new Error("Block not found");
  }

  event.timestamp = {
    datetime: `0x${block.timestamp.toString(16)}`,
    proof: `0x${block.number.toString(16).padStart(64, "0")}`,
  };

  doc.events.push(event);
}

export async function deployTrackAndTraceContract(): Promise<{
  broadcaster: SignerWithAddress;
  trackAndTraceContract: TrackAndTrace;
}> {
  const signers = (await hre.ethers.getSigners()) as [
    SignerWithAddress,
    SignerWithAddress,
    SignerWithAddress,
    ...SignerWithAddress[],
  ];
  const [admin, upgrader, broadcaster] = signers;

  const trackAndTraceLibFactory = await hre.ethers.getContractFactory(
    "TrackAndTraceLib",
    {},
  );
  const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

  const trackAndTraceContractFactory = await hre.ethers.getContractFactory(
    "TrackAndTrace",
    {
      libraries: {
        TrackAndTraceLib: await trackAndTraceLibContract.getAddress(),
      },
    },
  );

  // deploy TPR mock
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tprMock = await policyRegistryFactory.deploy();

  // deploy DID mock
  const didMockFactory = await hre.ethers.getContractFactory("DidRegistryMock");
  const didRegistryMock = await didMockFactory.deploy();

  const trackAndTraceContract = await hre.upgrades.deployProxy(
    trackAndTraceContractFactory,
    [
      admin.address,
      upgrader.address,
      await tprMock.getAddress(),
      await didRegistryMock.getAddress(),
    ],
    { unsafeAllowLinkedLibraries: true },
  );

  await didRegistryMock.setDidResult(true);
  await tprMock.setPolicyResult(true);

  return {
    broadcaster,
    trackAndTraceContract,
  };
}

export async function grantAccess(
  contract: TrackAndTrace,
  documentHash: string,
  grantedByAccount: string,
  subjectAccount: string,
  subjectAccType: (typeof AccountType)[keyof typeof AccountType],
) {
  // permission to delegate
  const txDelegate = await contract.grantAccess(
    documentHash,
    Buffer.from(grantedByAccount),
    await didToHex(subjectAccount),
    AccountType.DID_EBSI,
    subjectAccType,
    Permission.DELEGATE,
  );
  await txDelegate.wait();

  // permission to write
  const txWrite = await contract.grantAccess(
    documentHash,
    Buffer.from(grantedByAccount),
    await didToHex(subjectAccount),
    AccountType.DID_EBSI,
    subjectAccType,
    Permission.WRITE,
  );
  await txWrite.wait();
}

export async function insertDocumentWithBlockSource(
  contract: TrackAndTrace,
  creatorAccount: string,
) {
  const doc = createDocument(creatorAccount, false);

  const tx = await contract["createDocument(bytes32,string,string)"](
    doc.documentHash,
    doc.documentMetadata,
    doc.didEbsiCreator,
  );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const block = await hre.ethers.provider.getBlock(receipt.blockHash);

  if (!block) {
    throw new Error("Block not found");
  }

  doc.timestamp = {
    datetime: `0x${block.timestamp.toString(16)}`,
    proof: `0x${block.number.toString(16).padStart(64, "0")}`,
  };

  return doc;
}

export async function insertDocumentWithExternalSource(
  contract: TrackAndTrace,
  creatorAccount: string,
) {
  const doc = createDocument(creatorAccount, true);

  await contract["createDocument(bytes32,string,string,uint256,bytes32)"](
    doc.documentHash,
    doc.documentMetadata,
    doc.didEbsiCreator,
    doc.timestamp.datetime,
    doc.timestamp.proof,
  );

  return doc;
}

export async function setupTestEnv(): Promise<{
  documentsWithBlockSource: TestDocument[];
  documentsWithExternalSource: TestDocument[];
  operators: Operator[];
  provider: HardhatEthersProvider;
  trackAndTraceContract: TrackAndTrace;
}> {
  const ethersProvider = hre.ethers.provider;
  const supportOfficeAccount = EbsiWallet.createDid();
  const creatorAccount = dummyData.documents[0]!.creator;
  // Deploy contract
  const { broadcaster, trackAndTraceContract } =
    await deployTrackAndTraceContract();

  // Authorise creator account
  await trackAndTraceContract
    .connect(broadcaster)
    .authoriseDid(supportOfficeAccount, creatorAccount, true);

  const tx = await trackAndTraceContract[
    "createDocument(bytes32,string,string)"
  ](
    dummyData.documents[0]!.id,
    dummyData.documents[0]!.metadata,
    dummyData.documents[0]!.creator,
  );
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const block = await hre.ethers.provider.getBlock(receipt.blockHash);

  if (!block) {
    throw new Error("Block not found");
  }

  dummyData.documents[0]!.timestamp = Number(
    `0x${block.timestamp.toString(16)}`,
  ).toString();
  dummyData.documents[0]!.proof = `0x${block.number.toString(16).padStart(64, "0")}`;

  const formatTestDocument = (doc: Document): TestDocument => {
    return {
      didEbsiCreator: doc.creator,
      documentHash: doc.id,
      documentMetadata: doc.metadata,
      events: doc.events.map((e) => {
        return {
          documentHash: e.hash,
          eventHash: e.id,
          externalHash: e.externalHash,
          metadata: e.metadata,
          origin: e.origin,
          sender: hexToDid(e.sender),
          timestamp: {
            datetime: `0x${Number(e.timestamp).toString(16)}`,
            proof: e.proof,
          },
        };
      }),
      timestamp: {
        datetime: `0x${Number(doc.timestamp).toString(16)}`,
        proof: doc.proof,
      },
    };
  };
  const documentsWithBlockSource = dummyData.documentsWithBlockSource.map(
    (doc) => formatTestDocument(doc),
  );
  const documentsWithExternalSource = dummyData.documentsWithExternalSource.map(
    (doc) => formatTestDocument(doc),
  );

  // Return test env variables
  return {
    documentsWithBlockSource,
    documentsWithExternalSource,
    operators: dummyData.operators,
    provider: ethersProvider,
    trackAndTraceContract,
  };
}
