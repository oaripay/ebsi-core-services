import type { FilterV2, PresentationDefinitionV2 } from "@sphereon/pex-models";

export const OPENID_SCOPE = "openid";

export const DIDR_INVITE_SCOPE = "didr_invite";
export const DIDR_WRITE_SCOPE = "didr_write";
export const TIR_INVITE_SCOPE = "tir_invite";
export const TIR_WRITE_SCOPE = "tir_write";
export const TIMESTAMP_WRITE_SCOPE = "timestamp_write";
export const TNT_AUTHORISE_SCOPE = "tnt_authorise";
export const TNT_CREATE_SCOPE = "tnt_create";
export const TNT_WRITE_SCOPE = "tnt_write";

export const CUSTOM_SCOPES = [
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_SCOPE,
  TIR_WRITE_SCOPE,
  TIMESTAMP_WRITE_SCOPE,
  TNT_AUTHORISE_SCOPE,
  TNT_CREATE_SCOPE,
  TNT_WRITE_SCOPE,
] as const;

export const SUPPORTED_SCOPES = [OPENID_SCOPE, ...CUSTOM_SCOPES] as const;

export const DIDR_INVITE_PRESENTATION_DEFINITION = {
  id: "didr_invite_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  input_descriptors: [
    {
      id: "didr_invite_credential",
      name: "Accreditation to write to the DID Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationToOnboard issued by Root TAO or TAO",
      format: { jwt_vc: { alg: ["ES256"] }, jwt_vc_json: { alg: ["ES256"] } },
      constraints: {
        fields: [
          {
            path: ["$.vc.type"],
            filter: {
              type: "array",
              contains: {
                const: "VerifiableAuthorisationToOnboard",
              },
            },
          },
        ],
      },
    },
  ],
} as const satisfies PresentationDefinitionV2;

export const DIDR_WRITE_PRESENTATION_DEFINITION = {
  id: "didr_write_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present a valid Presentation signed by a registered Legal Entity.",
  input_descriptors: [],
} as const satisfies PresentationDefinitionV2;

export const TIR_INVITE_PRESENTATION_DEFINITION = {
  id: "tir_invite_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  input_descriptors: [
    {
      id: "tir_invite_credential",
      name: "Accreditation to write to the Trusted Issuers Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationForTrustChain from EBSI TO, or a Verifiable Accreditation (VerifiableAccreditationToAttest, VerifiableAccreditationToAccredit) issued by Root TAO or TAO.",
      format: { jwt_vc: { alg: ["ES256"] }, jwt_vc_json: { alg: ["ES256"] } },
      constraints: {
        fields: [
          {
            path: ["$.vc.type"],
            filter: {
              type: "array",
              contains: {
                anyOf: [
                  { const: "VerifiableAuthorisationForTrustChain" },
                  { const: "VerifiableAccreditationToAttest" },
                  { const: "VerifiableAccreditationToAccredit" },
                ],
                // TODO: potential issue here, as "anyOf" is not defined in PEX's FilterV2
              } as unknown as FilterV2,
            },
          },
        ],
      },
    },
  ],
} as const satisfies PresentationDefinitionV2;

export const TIR_WRITE_PRESENTATION_DEFINITION = {
  id: "tir_write_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  purpose: "Please present a valid Presentation signed by a Trusted Issuer.",
  input_descriptors: [],
} as const satisfies PresentationDefinitionV2;

export const TIMESTAMP_WRITE_PRESENTATION_DEFINITION = {
  id: "timestamp_write_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present an empty Presentation signed by a registered Legal Entity.",
  input_descriptors: [],
} as const satisfies PresentationDefinitionV2;

export const TNT_AUTHORISE_PRESENTATION_DEFINITION = {
  id: "tnt_authorise_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  input_descriptors: [
    {
      id: "tnt_authorise_credential",
      name: "Accreditation to create Track and Trace documents",
      purpose:
        "Please present a valid VerifiableAuthorisationToOnboard issued by an allowlisted entity",
      format: { jwt_vc: { alg: ["ES256"] }, jwt_vc_json: { alg: ["ES256"] } },
      constraints: {
        fields: [
          {
            path: ["$.vc.type"],
            filter: {
              type: "array",
              contains: {
                const: "VerifiableAuthorisationToOnboard",
              },
            },
          },
          {
            path: ["$.vc.issuer"],
            filter: {
              type: "string",
              enum: [], // This enum will be filled at runtime based on the TNT_AUTHORISE_ISSUERS_ALLOWLIST variable
            },
          },
        ],
      },
    },
  ],
} as const satisfies PresentationDefinitionV2;

export const TNT_CREATE_PRESENTATION_DEFINITION = {
  id: "tnt_create_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present a valid Presentation signed by an allowlisted TnT Document creator.",
  input_descriptors: [],
} as const satisfies PresentationDefinitionV2;

export const TNT_WRITE_PRESENTATION_DEFINITION = {
  id: "tnt_write_presentation",
  format: { jwt_vp: { alg: ["ES256"] } },
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present a valid Presentation signed by an account with granted access to write in TnT.",
  input_descriptors: [],
} as const satisfies PresentationDefinitionV2;

export const PRESENTATION_DEFINITIONS = {
  [`${DIDR_INVITE_SCOPE}`]: DIDR_INVITE_PRESENTATION_DEFINITION,
  [`${DIDR_WRITE_SCOPE}`]: DIDR_WRITE_PRESENTATION_DEFINITION,
  [`${TIR_INVITE_SCOPE}`]: TIR_INVITE_PRESENTATION_DEFINITION,
  [`${TIR_WRITE_SCOPE}`]: TIR_WRITE_PRESENTATION_DEFINITION,
  [`${TIMESTAMP_WRITE_SCOPE}`]: TIMESTAMP_WRITE_PRESENTATION_DEFINITION,
  [`${TNT_AUTHORISE_SCOPE}`]: TNT_AUTHORISE_PRESENTATION_DEFINITION,
  [`${TNT_CREATE_SCOPE}`]: TNT_CREATE_PRESENTATION_DEFINITION,
  [`${TNT_WRITE_SCOPE}`]: TNT_WRITE_PRESENTATION_DEFINITION,
} as const satisfies Record<
  (typeof CUSTOM_SCOPES)[number],
  PresentationDefinitionV2
>;
