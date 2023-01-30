import { randomUUID } from "node:crypto";
import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { PresentationSubmission } from "@sphereon/pex-models";
import {
  CUSTOM_SCOPES,
  DID_WRITE_PRESENTATION_DEFINITION,
  GENERIC_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_PRESENTATION_DEFINITION,
} from "../../src/modules/authorisation/authorisation.constants";

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

export interface LegalEntity extends EbsiIssuer {
  didDocument: DIDDocument;
}

export async function createLegalEntity(
  alg: "ES256" | "ES256K" | "EdDSA"
): Promise<LegalEntity> {
  const did = EbsiWallet.createDid();
  const keypair = await generateKeyPair(alg);
  const publicKeyJwk = await exportJWK(keypair.publicKey);
  const privateKeyJwk = await exportJWK(keypair.privateKey);
  const thumbprint = await calculateJwkThumbprint(publicKeyJwk);
  const kid = `${did}#${thumbprint}`;

  const didDocument = createDidDocument(did, kid, publicKeyJwk);

  return {
    publicKeyJwk,
    privateKeyJwk,
    alg,
    did,
    kid,
    didDocument,
  };
}

export function createPresentationSubmission(
  scope: (typeof CUSTOM_SCOPES)[number]
): PresentationSubmission {
  // Note that there are no .vc or .vp in path or path_nested below.
  const testPresentationSubmission: PresentationSubmission = {
    id: randomUUID(),
    definition_id: "",
    descriptor_map: [
      {
        id: "Any type of Verifiable Attestation",
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: "Any type of Verifiable Attestation",
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      },
    ],
  };

  switch (scope) {
    case "did_write": {
      testPresentationSubmission.definition_id =
        DID_WRITE_PRESENTATION_DEFINITION.id;
      break;
    }
    case "generic_write": {
      testPresentationSubmission.definition_id =
        GENERIC_WRITE_PRESENTATION_DEFINITION.id;
      break;
    }
    case "tir_write": {
      testPresentationSubmission.definition_id =
        TIR_WRITE_PRESENTATION_DEFINITION.id;
      break;
    }
    default: {
      throw new Error("Invalid scope");
    }
  }

  return testPresentationSubmission;
}
