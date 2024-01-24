// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/track-and-trace/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
// eslint-disable-next-line import/extensions
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers.js";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { createDocument, type Document } from "./data.js";

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

export async function insertDocument(
  contract: TrackAndTrace,
  creatorAccount?: string,
): Promise<Document> {
  const doc = createDocument(creatorAccount);

  await contract["createDocument(bytes32,string,string)"](
    doc.documentHash,
    doc.documentMetadata,
    doc.didEbsiCreator,
  );

  return doc;
}

export interface SetupOptions {
  documentsTotal?: number;
}

export async function setupTestEnv({
  documentsTotal = 1,
}: SetupOptions = {}): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  trackAndTraceContract: TrackAndTrace;
  documents: Document[];
}> {
  const ethersProvider = hre.ethers.provider;
  const documents: Document[] = [];
  const creatorAccount = EbsiWallet.createDid();

  // Deploy contract
  const { trackAndTraceContract, broadcaster } =
    await deployTrackAndTraceContract();

  // Authorise creator account
  await trackAndTraceContract
    .connect(broadcaster)
    .authoriseDid(creatorAccount, true);

  // Deploy documents
  documents.push(
    ...(await Promise.all(
      Array(documentsTotal)
        .fill(0)
        .map(() => insertDocument(trackAndTraceContract, creatorAccount)),
    )),
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    trackAndTraceContract,
    documents,
  };
}
