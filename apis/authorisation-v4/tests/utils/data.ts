import { randomUUID } from "node:crypto";
import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { PresentationSubmission } from "@sphereon/pex-models";
import {
  CUSTOM_SCOPES,
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_INVITE_SCOPE,
  TIR_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_SCOPE,
  TIMESTAMP_WRITE_PRESENTATION_DEFINITION,
  TIMESTAMP_WRITE_SCOPE,
  TNT_AUTHORISE_PRESENTATION_DEFINITION,
  TNT_AUTHORISE_SCOPE,
} from "../../src/modules/authorisation/authorisation.constants.js";

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

export interface LegalEntity extends EbsiIssuer {
  didDocument: DIDDocument;
}

export async function createLegalEntity(
  alg: "ES256" | "ES256K" | "EdDSA",
  did?: string | undefined,
): Promise<LegalEntity> {
  const legalEntityDid = did ?? EbsiWallet.createDid();
  const keypair = await generateKeyPair(alg);
  const publicKeyJwk = await exportJWK(keypair.publicKey);
  const privateKeyJwk = await exportJWK(keypair.privateKey);
  const thumbprint = await calculateJwkThumbprint(publicKeyJwk);
  const kid = `${legalEntityDid}#${thumbprint}`;

  const didDocument = createDidDocument(legalEntityDid, kid, publicKeyJwk);

  return {
    publicKeyJwk,
    privateKeyJwk,
    alg,
    did: legalEntityDid,
    kid,
    didDocument,
  };
}

export function createPresentationSubmission(
  scope: (typeof CUSTOM_SCOPES)[number],
): PresentationSubmission {
  // Note that there are no .vc or .vp in path or path_nested below.
  const testPresentationSubmission: PresentationSubmission = {
    id: randomUUID(),
    definition_id: "",
    descriptor_map: [],
  };

  switch (scope) {
    case DIDR_INVITE_SCOPE: {
      testPresentationSubmission.definition_id =
        DIDR_INVITE_PRESENTATION_DEFINITION.id;

      testPresentationSubmission.descriptor_map.push({
        id: DIDR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: DIDR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      });

      break;
    }
    case DIDR_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        DIDR_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TIR_INVITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TIR_INVITE_PRESENTATION_DEFINITION.id;

      testPresentationSubmission.descriptor_map.push({
        id: TIR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: TIR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      });

      break;
    }
    case TIR_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TIR_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TIMESTAMP_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TIMESTAMP_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TNT_AUTHORISE_SCOPE: {
      testPresentationSubmission.definition_id =
        TNT_AUTHORISE_PRESENTATION_DEFINITION.id;

      testPresentationSubmission.descriptor_map.push({
        id: TNT_AUTHORISE_PRESENTATION_DEFINITION.input_descriptors[0].id,
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: TNT_AUTHORISE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      });

      break;
    }
    default: {
      throw new Error("Invalid scope");
    }
  }

  return testPresentationSubmission;
}
