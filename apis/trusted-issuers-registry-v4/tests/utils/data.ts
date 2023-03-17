import type { JWK } from "jose";
import type { DIDDocument, JsonWebKey } from "did-resolver";

export function createDidDocument(
  did: string,
  kid: string,
  publicKeyJwk: JWK
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

// Context: "https://www.w3.org/ns/did/v1"
export const DID_DOCUMENT_CONTEXT = {
  "@context": {
    "@protected": true,
    id: "@id",
    type: "@type",

    alsoKnownAs: {
      "@id": "https://www.w3.org/ns/activitystreams#alsoKnownAs",
      "@type": "@id",
    },
    assertionMethod: {
      "@id": "https://w3id.org/security#assertionMethod",
      "@type": "@id",
      "@container": "@set",
    },
    authentication: {
      "@id": "https://w3id.org/security#authenticationMethod",
      "@type": "@id",
      "@container": "@set",
    },
    capabilityDelegation: {
      "@id": "https://w3id.org/security#capabilityDelegationMethod",
      "@type": "@id",
      "@container": "@set",
    },
    capabilityInvocation: {
      "@id": "https://w3id.org/security#capabilityInvocationMethod",
      "@type": "@id",
      "@container": "@set",
    },
    controller: {
      "@id": "https://w3id.org/security#controller",
      "@type": "@id",
    },
    keyAgreement: {
      "@id": "https://w3id.org/security#keyAgreementMethod",
      "@type": "@id",
      "@container": "@set",
    },
    service: {
      "@id": "https://www.w3.org/ns/did#service",
      "@type": "@id",
      "@context": {
        "@protected": true,
        id: "@id",
        type: "@type",
        serviceEndpoint: {
          "@id": "https://www.w3.org/ns/did#serviceEndpoint",
          "@type": "@id",
        },
      },
    },
    verificationMethod: {
      "@id": "https://w3id.org/security#verificationMethod",
      "@type": "@id",
    },
  },
};

// Context "https://w3id.org/security/suites/jws-2020/v1"
export const JWS_2020_CONTEXT = {
  "@context": {
    privateKeyJwk: {
      "@id": "https://w3id.org/security#privateKeyJwk",
      "@type": "@json",
    },
    JsonWebKey2020: {
      "@id": "https://w3id.org/security#JsonWebKey2020",
      "@context": {
        "@protected": true,
        id: "@id",
        type: "@type",
        publicKeyJwk: {
          "@id": "https://w3id.org/security#publicKeyJwk",
          "@type": "@json",
        },
      },
    },
    JsonWebSignature2020: {
      "@id": "https://w3id.org/security#JsonWebSignature2020",
      "@context": {
        "@protected": true,

        id: "@id",
        type: "@type",

        challenge: "https://w3id.org/security#challenge",
        created: {
          "@id": "http://purl.org/dc/terms/created",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        domain: "https://w3id.org/security#domain",
        expires: {
          "@id": "https://w3id.org/security#expiration",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        jws: "https://w3id.org/security#jws",
        nonce: "https://w3id.org/security#nonce",
        proofPurpose: {
          "@id": "https://w3id.org/security#proofPurpose",
          "@type": "@vocab",
          "@context": {
            "@protected": true,

            id: "@id",
            type: "@type",

            assertionMethod: {
              "@id": "https://w3id.org/security#assertionMethod",
              "@type": "@id",
              "@container": "@set",
            },
            authentication: {
              "@id": "https://w3id.org/security#authenticationMethod",
              "@type": "@id",
              "@container": "@set",
            },
            capabilityInvocation: {
              "@id": "https://w3id.org/security#capabilityInvocationMethod",
              "@type": "@id",
              "@container": "@set",
            },
            capabilityDelegation: {
              "@id": "https://w3id.org/security#capabilityDelegationMethod",
              "@type": "@id",
              "@container": "@set",
            },
            keyAgreement: {
              "@id": "https://w3id.org/security#keyAgreementMethod",
              "@type": "@id",
              "@container": "@set",
            },
          },
        },
        verificationMethod: {
          "@id": "https://w3id.org/security#verificationMethod",
          "@type": "@id",
        },
      },
    },
  },
};
