// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/track-and-trace/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
// eslint-disable-next-line import/extensions
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers.js";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  createDocument,
  type TestDocumentWithBlockSource,
  type TestDocumentWithExternalSource,
} from "./data.js";

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

  await contract["createDocument(bytes32,string,string)"](
    doc.documentHash,
    doc.documentMetadata,
    doc.didEbsiCreator,
  );

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

export interface SetupOptions {
  documentsWithBlockSourceTotal?: number;
  documentsWithExternalSourceTotal?: number;
}

export async function setupTestEnv({
  documentsWithBlockSourceTotal = 1,
  documentsWithExternalSourceTotal = 1,
}: SetupOptions = {}): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  trackAndTraceContract: TrackAndTrace;
  documentsWithBlockSource: TestDocumentWithBlockSource[];
  documentsWithExternalSource: TestDocumentWithExternalSource[];
}> {
  const ethersProvider = hre.ethers.provider;
  const documentsWithBlockSource: TestDocumentWithBlockSource[] = [];
  const documentsWithExternalSource: TestDocumentWithExternalSource[] = [];
  const creatorAccount = EbsiWallet.createDid();

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

  // Return test env variables
  return {
    provider: ethersProvider,
    trackAndTraceContract,
    documentsWithBlockSource,
    documentsWithExternalSource,
  };
}
