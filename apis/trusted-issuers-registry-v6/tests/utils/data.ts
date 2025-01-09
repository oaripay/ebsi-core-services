import type { DIDDocument, JsonWebKey } from "did-resolver";
import type { JWK } from "jose";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import { randomBytes } from "node:crypto";

import type { IssuerTypeValue } from "../../src/modules/issuers/issuers.constants.js";

export interface IssuerGraphObject {
  attributes: {
    id: string;
    lastRevision: RevisionGraphObject;
    revisions: RevisionGraphObject[];
  }[];
  id: string;
  proxies: {
    data: string;
    id: string;
  }[];
}

export interface RevisionGraphObject {
  data: string;
  id: string;
  issuerType: IssuerTypeValue;
  rootTao: string;
  tao: string;
}

export function createDidDocument(
  did: string,
  kid: string,
  publicKeyJwk: JWK,
): DIDDocument {
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    assertionMethod: [kid],
    authentication: [kid],
    id: did,
    verificationMethod: [
      {
        controller: did,
        id: kid,
        publicKeyJwk: publicKeyJwk as JsonWebKey,
        type: "JsonWebKey2020",
      },
    ],
  };
}

export const ISSUERS_TOTAL = 12;
export const ISSUER_ATTRIBUTES_TOTAL = 1;
export const ATTRIBUTE_REVISIONS_TOTAL = 2;
export const ISSUER_PROXIES_TOTAL = 1;

export const TAO = EbsiWallet.createDid();
export const ROOTTAO = EbsiWallet.createDid();
export const dummyIssuers: IssuerGraphObject[] = Array.from({
  length: ISSUERS_TOTAL,
}).map((_, i) => {
  let did = EbsiWallet.createDid();
  let tao = TAO;
  let issuerType: IssuerTypeValue = "TI";
  if (i === 0) {
    did = ROOTTAO;
    issuerType = "RootTAO";
    tao = ROOTTAO;
  } else if (i === 1) {
    did = TAO;
    issuerType = "TAO";
    tao = ROOTTAO;
  }

  return {
    attributes: Array.from({ length: ISSUER_ATTRIBUTES_TOTAL }).map(() => {
      const attributeId = `0x${randomBytes(32).toString("hex")}`;
      const firstRevision = {
        data: "",
        id: attributeId,
        issuerType,
        rootTao: ROOTTAO,
        tao,
      };
      const lastRevision = {
        data: randomBytes(20).toString("base64"),
        id: `0x${randomBytes(32).toString("hex")}`,
        issuerType,
        rootTao: ROOTTAO,
        tao,
      };
      return {
        id: attributeId,
        lastRevision,
        revisions: [
          firstRevision,
          ...Array.from({ length: ATTRIBUTE_REVISIONS_TOTAL - 2 }).map(() => ({
            data: randomBytes(20).toString("base64"),
            id: `0x${randomBytes(32).toString("hex")}`,
            issuerType,
            rootTao: ROOTTAO,
            tao,
          })),
          lastRevision,
        ],
      };
    }),
    id: did,
    proxies: Array.from({ length: ISSUER_PROXIES_TOTAL }).map(() => {
      const data = JSON.stringify({
        headers: {
          Authorization: `Bearer ${randomBytes(16).toString("hex")}`,
        },
        prefix: "https://example.net",
        testSuffix: "/cred/1",
      });
      const id = ethers.sha256(Buffer.from(data));
      return { data, id };
    }),
  };
});
