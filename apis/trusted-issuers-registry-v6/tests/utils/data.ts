import { randomBytes } from "node:crypto";
import type { JWK } from "jose";
import { ethers } from "ethers";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";

export interface RevisionGraphObject {
  id: string;
  data: string;
  issuerType: string;
  tao: string;
  rootTao: string;
}

export interface IssuerGraphObject {
  id: string;
  attributes: {
    id: string;
    lastRevision: RevisionGraphObject;
    revisions: RevisionGraphObject[];
  }[];
  proxies: {
    id: string;
    data: string;
  }[];
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
    id: did,
    verificationMethod: [
      {
        id: kid,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: publicKeyJwk as JsonWebKey,
      },
    ],
    authentication: [kid],
    assertionMethod: [kid],
  };
}

export const ISSUERS_TOTAL = 12;
export const ISSUER_ATTRIBUTES_TOTAL = 1;
export const ATTRIBUTE_REVISIONS_TOTAL = 2;
export const ISSUER_PROXIES_TOTAL = 1;

export const TAO = EbsiWallet.createDid();
export const ROOTTAO = EbsiWallet.createDid();
export const dummyIssuers: IssuerGraphObject[] = Array(ISSUERS_TOTAL)
  .fill(undefined)
  .map((_, i) => {
    let did = EbsiWallet.createDid();
    let tao = TAO;
    let issuerType = "TI";
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
      id: did,
      attributes: Array(ISSUER_ATTRIBUTES_TOTAL)
        .fill(undefined)
        .map(() => {
          const attributeId = `0x${randomBytes(32).toString("hex")}`;
          const firstRevision = {
            id: attributeId,
            data: "",
            issuerType,
            tao,
            rootTao: ROOTTAO,
          };
          const lastRevision = {
            id: `0x${randomBytes(32).toString("hex")}`,
            data: randomBytes(20).toString("base64"),
            issuerType,
            tao,
            rootTao: ROOTTAO,
          };
          return {
            id: attributeId,
            lastRevision,
            revisions: [
              firstRevision,
              ...Array(ATTRIBUTE_REVISIONS_TOTAL - 2)
                .fill(undefined)
                .map(() => ({
                  id: `0x${randomBytes(32).toString("hex")}`,
                  data: randomBytes(20).toString("base64"),
                  issuerType,
                  tao,
                  rootTao: ROOTTAO,
                })),
              lastRevision,
            ],
          };
        }),
      proxies: Array(ISSUER_PROXIES_TOTAL)
        .fill(undefined)
        .map(() => {
          const data = JSON.stringify({
            prefix: "https://example.net",
            headers: {
              Authorization: `Bearer ${randomBytes(16).toString("hex")}`,
            },
            testSuffix: "/cred/1",
          });
          const id = ethers.utils.sha256(Buffer.from(data));
          return { id, data };
        }),
    };
  });
