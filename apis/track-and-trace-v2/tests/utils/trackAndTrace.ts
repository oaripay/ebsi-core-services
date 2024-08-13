// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/track-and-trace/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
// eslint-disable-next-line import/extensions
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers.js";
import {
  createDocument,
  createEvent,
  dummyData,
  type TestDocument,
} from "./data.js";
import { didToHex, hexToDid } from "../../src/shared/utils.js";
import { AccountType, Permission } from "../../src/shared/constants.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Document, Operator } from "../../.graphclient/index.js";

export async function deployTrackAndTraceContract(): Promise<{
  trackAndTraceContract: TrackAndTrace;
  broadcaster: SignerWithAddress;
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
    { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
  );

  // deploy TPR mock
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tprMock = await policyRegistryFactory.deploy();

  // deploy DID mock
  const didMockFactory = await hre.ethers.getContractFactory("DidRegistryMock");
  const didRegistryMock = await didMockFactory.deploy();

  const trackAndTraceContract = (await hre.upgrades.deployProxy(
    trackAndTraceContractFactory,
    [admin.address, upgrader.address, tprMock.address, didRegistryMock.address],
    { unsafeAllowLinkedLibraries: true },
  )) as unknown as TrackAndTrace;

  await didRegistryMock.setDidResult(true);
  await tprMock.setPolicyResult(true);

  return {
    trackAndTraceContract,
    broadcaster,
  };
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

  const block = await hre.ethers.provider.getBlock(receipt.blockHash);

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

export async function addEvent(contract: TrackAndTrace, doc: TestDocument) {
  const event = createEvent(doc.documentHash, doc.didEbsiCreator);

  const tx = await contract["writeEvent((bytes32,string,bytes,string,string))"](
    {
      documentHash: event.documentHash,
      externalHash: event.externalHash,
      sender: await didToHex(event.sender),
      origin: event.origin,
      metadata: event.metadata,
    },
  );

  const receipt = await tx.wait();

  const block = await hre.ethers.provider.getBlock(receipt.blockHash);

  event.timestamp = {
    datetime: `0x${block.timestamp.toString(16)}`,
    proof: `0x${block.number.toString(16).padStart(64, "0")}`,
  };

  doc.events.push(event);
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

export interface SetupOptions {
  documentsWithBlockSourceTotal?: number;
  documentsWithExternalSourceTotal?: number;
  documentEventsTotal?: number;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  trackAndTraceContract: TrackAndTrace;
  documentsWithBlockSource: TestDocument[];
  documentsWithExternalSource: TestDocument[];
  operators: Operator[];
}> {
  const ethersProvider = hre.ethers.provider;
  const supportOfficeAccount = EbsiWallet.createDid();
  const creatorAccount = dummyData.documents[0]!.creator;
  // Deploy contract
  const { trackAndTraceContract, broadcaster } =
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
  const block = await hre.ethers.provider.getBlock(receipt.blockHash);
  dummyData.documents[0]!.timestamp = Number(
    `0x${block.timestamp.toString(16)}`,
  ).toString();
  dummyData.documents[0]!.proof = `0x${block.number.toString(16).padStart(64, "0")}`;

  const formatTestDocument = (doc: Document): TestDocument => {
    return {
      documentHash: doc.id,
      documentMetadata: doc.metadata,
      didEbsiCreator: doc.creator,
      events: doc.events.map((e) => {
        return {
          documentHash: e.hash,
          eventHash: e.id,
          externalHash: e.externalHash,
          sender: hexToDid(e.sender),
          origin: e.origin,
          metadata: e.metadata,
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
  const documentsWithBlockSource =
    dummyData.documentsWithBlockSource.map(formatTestDocument);
  const documentsWithExternalSource =
    dummyData.documentsWithExternalSource.map(formatTestDocument);

  // Return test env variables
  return {
    provider: ethersProvider,
    trackAndTraceContract,
    documentsWithBlockSource,
    documentsWithExternalSource,
    operators: dummyData.operators,
  };
}
