/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";

export interface Document {
  documentHash: string;
  documentMetadata: string;
  didEbsiCreator: string;
}

export function createDocument(
  didEbsiCreator = EbsiWallet.createDid(),
): Document {
  const documentHash = ethers.utils.sha256(randomBytes(32));
  const documentMetadata = "metadata";

  return {
    documentHash,
    documentMetadata,
    didEbsiCreator,
  };
}
