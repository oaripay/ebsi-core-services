import { util } from "@cef-ebsi/key-did-resolver";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import { ethers } from "ethers";
/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";

import {
  Creator,
  Document,
  Event,
  Invitation,
  Operator,
} from "../../.graphclient/index.js";
import { didToHex } from "../../src/shared/utils.js";

export interface InvitationWithWallet extends Invitation {
  wallet: ethers.BaseWallet;
}

export interface TestDocument {
  didEbsiCreator: string;
  documentHash: string;
  documentMetadata: string;
  events: TestDocumentEvent[];
  timestamp: {
    datetime: string;
    proof: string;
  };
}

export interface TestDocumentEvent {
  documentHash: string;
  eventHash: string;
  externalHash: string;
  metadata: string;
  origin: string;
  sender: string;
  timestamp: {
    datetime: string;
    proof: string;
  };
}

export function createDocument(
  didEbsiCreator: string,
  externalSource = false,
): TestDocument {
  const documentHash = ethers.sha256(randomBytes(32));
  const documentMetadata = "metadata";

  return {
    didEbsiCreator,
    documentHash,
    documentMetadata,
    events: [],
    ...(externalSource
      ? {
          timestamp: {
            datetime: ethers.toBeHex(Date.now()),
            proof: ethers.sha256(randomBytes(32)),
          },
        }
      : {
          timestamp: {
            datetime: "0x00",
            proof: "0x00",
          },
        }),
  };
}

export function createEvent(
  documentHash: string,
  didEbsiCreator: string,
): TestDocumentEvent {
  const externalHash = `externalHash${randomBytes(5).toString("hex")}`;
  const eventHash = ethers.keccak256(ethers.toUtf8Bytes(externalHash));
  const origin = "origin";
  const metadata = "eventMetadata";
  const sender = didEbsiCreator;

  const event = {
    documentHash,
    eventHash,
    externalHash,
    metadata,
    origin,
    sender,
    timestamp: {
      datetime: "0x00",
      proof: "0x00",
    },
  };

  return event;
}

export const CREATORS_TOTAL = 12;
export const DOCUMENTS_TOTAL = 12;
export const INVITATIONS_TOTAL = 12;

export const DOCUMENTS_WITH_BLOCK_SOURCE = 3;
export const DOCUMENTS_WITH_EXTERNAL_SOURCE = 3;
export const DOCUMENT_EVENTS = 3;

const creators = Array.from({ length: CREATORS_TOTAL }).map(
  () =>
    ({
      active: true,
      documents: [] as Document[],
      id: EbsiWallet.createDid(),
    }) satisfies Creator,
);

const documentsWithBlockSource = Array.from({
  length: DOCUMENTS_WITH_BLOCK_SOURCE,
}).map(
  () =>
    ({
      creator: creators[0]!.id,
      events: [] as Event[],
      id: `0x${randomBytes(32).toString("hex")}`,
      invitations: [],
      metadata: `metadata-${randomBytes(5).toString("hex")}`,
      proof: `0x${randomBytes(32).toString("hex")}`,
      source: "block",
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }) satisfies Document,
);

const documentsWithExternalSource = Array.from({
  length: DOCUMENTS_WITH_EXTERNAL_SOURCE,
}).map(
  () =>
    ({
      creator: creators[0]!.id,
      events: [] as Event[],
      id: `0x${randomBytes(32).toString("hex")}`,
      invitations: [] as Invitation[],
      metadata: `metadata-${randomBytes(5).toString("hex")}`,
      proof: `0x${randomBytes(32).toString("hex")}`,
      source: "external",
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }) satisfies Document,
);

const documents = [...documentsWithBlockSource, ...documentsWithExternalSource];

creators[0]!.documents = documents;

const invitations = await Promise.all(
  Array.from({ length: INVITATIONS_TOTAL }).map(async (_, i) => {
    let subject: string;
    const wallet = ethers.Wallet.createRandom();
    if (i % 2 === 0) {
      const publicKeyJwk = encode.publicKey.fromHexToJWK(
        wallet.signingKey.publicKey,
      );
      subject = util.createDid(publicKeyJwk);
    } else {
      subject = EbsiWallet.createDid();
    }
    const subjectHex = await didToHex(subject);
    const grantedBy = `0x${Buffer.from(creators[0]!.id).toString("hex")}`;
    if (i === 0) {
      return {
        children: [],
        document: documents[0]!,
        grantedBy,
        id: `${documents[0]!.id}${subjectHex}1`,
        subject: grantedBy,
        type: "creator",
        wallet,
      } satisfies InvitationWithWallet;
    }

    return {
      children: [],
      document: documents[0]!,
      grantedBy,
      id: `${documents[0]!.id}${subjectHex}1`,
      subject: subjectHex,
      type: i % 2 === 0 ? "write" : "delegate",
      wallet,
    } satisfies InvitationWithWallet;
  }),
);

documents[0]!.invitations = invitations;

const operators: Operator[] = [];
for (const invitation of invitations) {
  operators.push({
    id: invitation.subject,
    invitations: [invitation],
  });
}

const events = Array.from({ length: DOCUMENT_EVENTS }).map(() => {
  const id = `0x${randomBytes(32).toString("hex")}`;
  return {
    externalHash: `0x${randomBytes(32).toString("hex")}`,
    hash: id,
    id,
    metadata: `event-metadata-${randomBytes(5).toString("hex")}`,
    origin: `origin-${randomBytes(5).toString("hex")}`,
    proof: `0x${randomBytes(32).toString("hex")}`,
    sender: operators[0]!.id,
    source: "block",
    timestamp: Math.floor(Date.now() / 1000).toString(),
  } satisfies Event;
});

documents[0]!.events = events;

export const dummyData = {
  creators,
  documents,
  documentsWithBlockSource,
  documentsWithExternalSource,
  events,
  invitations,
  operators,
};
