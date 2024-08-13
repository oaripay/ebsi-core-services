/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";
import { ethers } from "ethers";
import { util } from "@cef-ebsi/key-did-resolver";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import {
  Document,
  Creator,
  Operator,
  Invitation,
  Event,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../.graphclient/index.js";
import { didToHex } from "../../src/shared/utils.js";

export interface InvitationWithWallet extends Invitation {
  wallet: ethers.Wallet;
}

export interface TestDocument {
  documentHash: string;
  documentMetadata: string;
  didEbsiCreator: string;
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
  sender: string;
  origin: string;
  metadata: string;
  timestamp: {
    datetime: string;
    proof: string;
  };
}

export function createDocument(
  didEbsiCreator: string,
  externalSource = false,
): TestDocument {
  const documentHash = ethers.utils.sha256(randomBytes(32));
  const documentMetadata = "metadata";

  return {
    documentHash,
    documentMetadata,
    didEbsiCreator,
    events: [],
    ...(externalSource
      ? {
          timestamp: {
            datetime: ethers.utils.hexValue(Date.now()),
            proof: ethers.utils.sha256(randomBytes(32)),
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
  const eventHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(externalHash),
  );
  const origin = "origin";
  const metadata = "eventMetadata";
  const sender = didEbsiCreator;

  const event = {
    documentHash,
    eventHash,
    externalHash,
    sender,
    origin,
    metadata,
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

const creators: Creator[] = Array(CREATORS_TOTAL)
  .fill(undefined)
  .map(() => ({
    id: EbsiWallet.createDid(),
    active: true,
    documents: [],
  }));

const documentsWithBlockSource: Document[] = Array(DOCUMENTS_WITH_BLOCK_SOURCE)
  .fill(undefined)
  .map(() => ({
    id: `0x${randomBytes(32).toString("hex")}`,
    creator: creators[0]!.id,
    metadata: `metadata-${randomBytes(5).toString("hex")}`,
    proof: `0x${randomBytes(32).toString("hex")}`,
    source: "block",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    invitations: [],
    events: [],
  }));

const documentsWithExternalSource: Document[] = Array(
  DOCUMENTS_WITH_EXTERNAL_SOURCE,
)
  .fill(undefined)
  .map(() => ({
    id: `0x${randomBytes(32).toString("hex")}`,
    creator: creators[0]!.id,
    metadata: `metadata-${randomBytes(5).toString("hex")}`,
    proof: `0x${randomBytes(32).toString("hex")}`,
    source: "external",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    invitations: [],
    events: [],
  }));

const documents = [...documentsWithBlockSource, ...documentsWithExternalSource];

creators[0]!.documents = documents;

const invitations: InvitationWithWallet[] = await Promise.all(
  Array(INVITATIONS_TOTAL)
    .fill(undefined)
    .map(async (_, i) => {
      let subject: string;
      const wallet = ethers.Wallet.createRandom();
      if (i % 2 === 0) {
        const publicKeyJwk = encode.publicKey.fromHexToJWK(wallet.publicKey);
        subject = util.createDid(publicKeyJwk);
      } else {
        subject = EbsiWallet.createDid();
      }
      const subjectHex = await didToHex(subject);
      const grantedBy = `0x${Buffer.from(creators[0]!.id).toString("hex")}`;
      if (i === 0) {
        return {
          id: `${documents[0]!.id}${subjectHex}1`,
          grantedBy,
          subject: grantedBy,
          type: "creator",
          document: documents[0]!,
          children: [],
          wallet,
        };
      }

      return {
        id: `${documents[0]!.id}${subjectHex}1`,
        grantedBy,
        subject: subjectHex,
        type: i % 2 === 0 ? "write" : "delegate",
        document: documents[0]!,
        children: [],
        wallet,
      };
    }),
);
documents[0]!.invitations = invitations;

const operators: Operator[] = [];
invitations.forEach((invitation) => {
  operators.push({
    id: invitation.subject,
    invitations: [invitation],
  });
});

const events: Event[] = Array(DOCUMENT_EVENTS)
  .fill(undefined)
  .map(() => {
    const id = `0x${randomBytes(32).toString("hex")}`;
    return {
      id,
      hash: id,
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      metadata: `event-metadata-${randomBytes(5).toString("hex")}`,
      origin: `origin-${randomBytes(5).toString("hex")}`,
      proof: `0x${randomBytes(32).toString("hex")}`,
      sender: operators[0]!.id,
      source: "block",
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  });
documents[0]!.events = events;

export const dummyData = {
  creators,
  documents,
  documentsWithBlockSource,
  documentsWithExternalSource,
  invitations,
  operators,
  events,
};
