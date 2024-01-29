/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";
import { ethers } from "ethers";

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

export function createEvent(documentHash: string): TestDocumentEvent {
  const eventHash = ethers.utils.sha256(randomBytes(32));
  const externalHash = "externalHash";
  const sender = "sender";
  const origin = "origin";
  const metadata = "eventMetadata";

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
