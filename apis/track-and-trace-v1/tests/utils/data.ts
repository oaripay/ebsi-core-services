/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";
import { ethers } from "ethers";

export interface TestDocumentWithBlockSource {
  documentHash: string;
  documentMetadata: string;
  didEbsiCreator: string;
}

export interface TestDocumentWithExternalSource
  extends TestDocumentWithBlockSource {
  timestamp: {
    datetime: string;
    proof: string;
  };
}

export function createDocument(
  didEbsiCreator: string,
  externalSource: false,
): TestDocumentWithBlockSource;
export function createDocument(
  didEbsiCreator: string,
  externalSource: true,
): TestDocumentWithExternalSource;
export function createDocument(
  didEbsiCreator: string,
  externalSource = false,
): TestDocumentWithBlockSource | TestDocumentWithExternalSource {
  const documentHash = ethers.utils.sha256(randomBytes(32));
  const documentMetadata = "metadata";

  return {
    documentHash,
    documentMetadata,
    didEbsiCreator,
    ...(externalSource && {
      timestamp: {
        datetime: ethers.utils.hexValue(Date.now()),
        proof: ethers.utils.sha256(randomBytes(32)),
      },
    }),
  };
}
