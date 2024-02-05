// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/track-and-trace/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
// eslint-disable-next-line import/extensions
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers.js";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { createDocument, createEvent, type TestDocument } from "./data.js";

export async function deployTrackAndTraceContract(): Promise<{
  trackAndTraceContract: TrackAndTrace;
  admin: SignerWithAddress;
  upgrader: SignerWithAddress;
  broadcaster: SignerWithAddress;
}> {
  const signers = (await hre.ethers.getSigners()) as [
    SignerWithAddress,
    SignerWithAddress,
    SignerWithAddress,
    ...SignerWithAddress[],
  ];
  const [admin, upgrader, broadcaster] = signers;

  const trackAndTraceContractFactory = await hre.ethers.getContractFactory(
    "TrackAndTrace",
    {},
  );

  const didMockFactory = await hre.ethers.getContractFactory("DidRegistryMock");

  const didRegistryMock = await didMockFactory.deploy();

  const trackAndTraceContract = (await hre.upgrades.deployProxy(
    trackAndTraceContractFactory,
    [admin.address, upgrader.address, didRegistryMock.address],
  )) as unknown as TrackAndTrace;

  await didRegistryMock.setDidResult(true);

  return {
    trackAndTraceContract,
    admin,
    upgrader,
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
      sender: event.sender,
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
  grantedDidEbsiAccount: string,
) {
  // permission to delegate
  const txDelegate = await contract.grantAccess(
    documentHash,
    Buffer.from(grantedByAccount),
    Buffer.from(grantedDidEbsiAccount),
    0,
    0,
    0,
  );
  await txDelegate.wait();

  // permission to write
  const txWrite = await contract.grantAccess(
    documentHash,
    Buffer.from(grantedByAccount),
    Buffer.from(grantedDidEbsiAccount),
    0,
    0,
    1,
  );
  await txWrite.wait();
}

export interface SetupOptions {
  documentsWithBlockSourceTotal?: number;
  documentsWithExternalSourceTotal?: number;
  documentEventsTotal?: number;
}

export async function setupTestEnv({
  documentsWithBlockSourceTotal = 1,
  documentsWithExternalSourceTotal = 1,
  documentEventsTotal = 1,
}: SetupOptions = {}): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  trackAndTraceContract: TrackAndTrace;
  documentsWithBlockSource: TestDocument[];
  documentsWithExternalSource: TestDocument[];
  creatorAccount: string;
  grantedDidEbsiAccount: string;
}> {
  const ethersProvider = hre.ethers.provider;
  const documentsWithBlockSource: TestDocument[] = [];
  const documentsWithExternalSource: TestDocument[] = [];
  const creatorAccount = EbsiWallet.createDid();
  const grantedDidEbsiAccount = EbsiWallet.createDid();

  // Deploy contract
  const { trackAndTraceContract, broadcaster } =
    await deployTrackAndTraceContract();

  // Authorise creator account
  await trackAndTraceContract
    .connect(broadcaster)
    .authoriseDid(creatorAccount, true);

  // Deploy documents
  documentsWithBlockSource.push(
    ...(await Promise.all(
      Array(documentsWithBlockSourceTotal)
        .fill(0)
        .map(() =>
          insertDocumentWithBlockSource(trackAndTraceContract, creatorAccount),
        ),
    )),
  );
  documentsWithExternalSource.push(
    ...(await Promise.all(
      Array(documentsWithExternalSourceTotal)
        .fill(0)
        .map(() =>
          insertDocumentWithExternalSource(
            trackAndTraceContract,
            creatorAccount,
          ),
        ),
    )),
  );

  // Add events to first element of documentsWithBlockSource
  await Promise.all(
    Array(documentEventsTotal)
      .fill(0)
      .map(() => addEvent(trackAndTraceContract, documentsWithBlockSource[0]!)),
  );

  // Grant access to an account
  await Promise.all(
    Array(documentsWithBlockSourceTotal)
      .fill(0)
      .map((_, i) =>
        grantAccess(
          trackAndTraceContract,
          documentsWithBlockSource[i]!.documentHash,
          creatorAccount,
          grantedDidEbsiAccount,
        ),
      ),
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    trackAndTraceContract,
    documentsWithBlockSource,
    documentsWithExternalSource,
    creatorAccount,
    grantedDidEbsiAccount,
  };
}
