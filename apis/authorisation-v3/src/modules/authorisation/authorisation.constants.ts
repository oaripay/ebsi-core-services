import type { ReadonlyDeep } from "type-fest";

import type { PresentationDefinition } from "../../shared/interfaces/pex.ts";

export const OPENID_SCOPE = "openid";

export const DIDR_INVITE_SCOPE = "didr_invite";
export const DIDR_WRITE_SCOPE = "didr_write";
export const TIR_INVITE_SCOPE = "tir_invite";
export const TIR_WRITE_SCOPE = "tir_write";

export const CUSTOM_SCOPES = [
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_SCOPE,
  TIR_WRITE_SCOPE,
] as const;

export const SUPPORTED_SCOPES = [OPENID_SCOPE, ...CUSTOM_SCOPES] as const;

export const DIDR_INVITE_PRESENTATION_DEFINITION = {
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
  id: "didr_invite_presentation",
  input_descriptors: [
    {
      constraints: {
        fields: [
          {
            filter: {
              contains: {
                const: "VerifiableAuthorisationToOnboard",
              },
              type: "array",
            },
            path: ["$.type"],
          },
        ],
      },
      id: "didr_invite_credential",
      name: "Accreditation to write to the DID Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationToOnboard issued by Root TAO or TAO",
    },
  ],
} as const satisfies ReadonlyDeep<PresentationDefinition>;

export const DIDR_WRITE_PRESENTATION_DEFINITION = {
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
  id: "didr_write_presentation",
  input_descriptors: [],
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present a valid Presentation signed by a registered Legal Entity.",
} as const satisfies ReadonlyDeep<PresentationDefinition>;

export const TIR_INVITE_PRESENTATION_DEFINITION = {
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
  id: "tir_invite_presentation",
  input_descriptors: [
    {
      constraints: {
        fields: [
          {
            filter: {
              contains: {
                anyOf: [
                  { const: "VerifiableAuthorisationForTrustChain" },
                  { const: "VerifiableAccreditationToAttest" },
                  { const: "VerifiableAccreditationToAccredit" },
                ],
              },
              type: "array",
            },
            path: ["$.type"],
          },
        ],
      },
      id: "tir_invite_credential",
      name: "Accreditation to write to the Trusted Issuers Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationForTrustChain from EBSI TO, or a Verifiable Accreditation (VerifiableAccreditationToAttest, VerifiableAccreditationToAccredit) issued by Root TAO or TAO.",
    },
  ],
} as const satisfies ReadonlyDeep<PresentationDefinition>;

export const TIR_WRITE_PRESENTATION_DEFINITION = {
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
  id: "tir_write_presentation",
  input_descriptors: [],
  name: "Any type of Verifiable Attestation",
  purpose: "Please present a valid Presentation signed by a Trusted Issuer.",
} as const satisfies ReadonlyDeep<PresentationDefinition>;
