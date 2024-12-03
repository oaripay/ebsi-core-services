import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { PresentationSubmission } from "@sphereon/pex-models";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import type { JWK } from "jose";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  generatePrivateKey,
  getPublicKeyJwk,
  getSigner,
} from "@ebsiint-api/shared";
import { randomUUID } from "node:crypto";

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
} from "../../src/modules/authorisation/authorisation.constants.js";

export interface LegalEntity extends EbsiIssuer {
  didDocument: DIDDocument;
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

export async function createLegalEntity(
  alg: "EdDSA" | "ES256" | "ES256K",
): Promise<LegalEntity> {
  const did = EbsiWallet.createDid();
  const privateKey = generatePrivateKey(alg);
  const publicKeyJwk = await getPublicKeyJwk(privateKey, alg);
  const kid = `${did}#${publicKeyJwk.kid}`;

  const didDocument = createDidDocument(did, kid, publicKeyJwk);

  return {
    alg,
    did,
    didDocument,
    kid,
    signer: getSigner(privateKey, alg),
  };
}

export function createPresentationSubmission(
  scope: (typeof CUSTOM_SCOPES)[number],
): PresentationSubmission {
  // Note that there are no .vc or .vp in path or path_nested below.
  const testPresentationSubmission: PresentationSubmission = {
    definition_id: "",
    descriptor_map: [],
    id: randomUUID(),
  };

  switch (scope) {
    case DIDR_INVITE_SCOPE: {
      testPresentationSubmission.definition_id =
        DIDR_INVITE_PRESENTATION_DEFINITION.id;

      testPresentationSubmission.descriptor_map.push({
        format: "jwt_vp",
        id: DIDR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
        path: "$",
        path_nested: {
          format: "jwt_vc",
          id: DIDR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
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
        format: "jwt_vp",
        id: TIR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
        path: "$",
        path_nested: {
          format: "jwt_vc",
          id: TIR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
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
    default: {
      throw new Error("Invalid scope");
    }
  }

  return testPresentationSubmission;
}
