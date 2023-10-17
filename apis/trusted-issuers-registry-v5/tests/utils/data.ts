import type { JWK } from "jose";
import type { DIDDocument, JsonWebKey } from "did-resolver";

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

export default createDidDocument;
