import { randomUUID } from "node:crypto";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { PresentationSubmission } from "@sphereon/pex-models";
import {
  generatePrivateKey,
  getPublicKeyJwk,
  getSigner,
} from "@ebsiint-api/shared";
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
  TNT_CREATE_SCOPE,
  TNT_CREATE_PRESENTATION_DEFINITION,
  TNT_WRITE_SCOPE,
  TNT_WRITE_PRESENTATION_DEFINITION,
  TPR_WRITE_SCOPE,
  TPR_WRITE_PRESENTATION_DEFINITION,
  TSR_WRITE_SCOPE,
  TSR_WRITE_PRESENTATION_DEFINITION,
} from "../../src/modules/authorisation/authorisation.constants.js";

export function createDidDocument(
  did: string,
  keys: Record<string, EbsiIssuer & { publicKeyJwk: JsonWebKey }>,
): DIDDocument {
  const kids = Object.keys(keys).map((alg) => keys[alg]!.kid);
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    verificationMethod: Object.keys(keys).map((alg) => ({
      id: keys[alg]!.kid,
      type: "JsonWebKey2020",
      controller: did,
      publicKeyJwk: keys[alg]!.publicKeyJwk,
    })),
    authentication: kids,
    assertionMethod: kids,
    capabilityInvocation: kids,
  };
}

export interface LegalEntity<T extends "ES256" | "ES256K" | "EdDSA"> {
  did: string;
  keys: Record<T, EbsiIssuer & { publicKeyJwk: JsonWebKey }>;
  didDocument: DIDDocument;
}

export async function createLegalEntity<T extends "ES256" | "ES256K" | "EdDSA">(
  algs: T[],
  did?: string | undefined,
): Promise<LegalEntity<T>> {
  const legalEntityDid = did ?? EbsiWallet.createDid();

  const keys: Record<string, EbsiIssuer & { publicKeyJwk: JsonWebKey }> = {};

  /* eslint-disable no-await-in-loop */
  // eslint-disable-next-line no-restricted-syntax
  for (const alg of algs) {
    const privateKey = generatePrivateKey(alg);
    const publicKeyJwk = await getPublicKeyJwk(privateKey, alg);
    const kid = `${legalEntityDid}#${publicKeyJwk.kid}`;

    keys[alg] = {
      did: legalEntityDid,
      kid,
      alg,
      publicKeyJwk,
      signer: getSigner(privateKey, alg),
    };
  }
  /* eslint-enable no-await-in-loop */

  const didDocument = createDidDocument(legalEntityDid, keys);

  return {
    keys,
    did: legalEntityDid,
    didDocument,
  };
}

export function createPresentationSubmission(
  scope: (typeof CUSTOM_SCOPES)[number],
  vpFormat: "jwt_vp" | "jwt_vp_json",
  vcFormat: "jwt_vc" | "jwt_vc_json",
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
        format: vpFormat,
        path: "$",
        path_nested: {
          id: DIDR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: vcFormat,
          path: "$.vp.verifiableCredential[0]",
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
        format: vpFormat,
        path: "$",
        path_nested: {
          id: TIR_INVITE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: vcFormat,
          path: "$.vp.verifiableCredential[0]",
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
        format: vpFormat,
        path: "$",
        path_nested: {
          id: TNT_AUTHORISE_PRESENTATION_DEFINITION.input_descriptors[0].id,
          format: vcFormat,
          path: "$.vp.verifiableCredential[0]",
        },
      });

      break;
    }
    case TNT_CREATE_SCOPE: {
      testPresentationSubmission.definition_id =
        TNT_CREATE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TNT_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TNT_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TPR_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TPR_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    case TSR_WRITE_SCOPE: {
      testPresentationSubmission.definition_id =
        TSR_WRITE_PRESENTATION_DEFINITION.id;

      break;
    }
    default: {
      throw new Error("Invalid scope");
    }
  }

  return testPresentationSubmission;
}
