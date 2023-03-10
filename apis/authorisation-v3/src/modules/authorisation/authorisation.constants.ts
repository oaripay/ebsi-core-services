import { PresentationDefinition } from "../../shared/interfaces/pex";

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

export const DIDR_INVITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "didr_invite_presentation",
  input_descriptors: [
    {
      id: "didr_invite_credential",
      name: "Accreditation to write to the DID Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationToOnboard issued by Root TAO or TAO",
      constraints: {
        fields: [
          {
            path: ["$.type"],
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
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
};

export const DIDR_WRITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "didr_write_presentation",
  name: "Any type of Verifiable Attestation",
  purpose:
    "Please present a valid Presentation signed by a registered Legal Entity.",
  input_descriptors: [],
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
};

export const TIR_INVITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "tir_invite_presentation",
  input_descriptors: [
    {
      id: "tir_invite_credential",
      name: "Accreditation to write to the Trusted Issuers Registry",
      purpose:
        "Please present a valid VerifiableAuthorisationForTrustChain from EBSI TO, or a Verifiable Accreditation (VerifiableAccreditationToAttest, VerifiableAccreditationToAccredit) issued by Root TAO or TAO.",
      constraints: {
        fields: [
          {
            path: ["$.type"],
            filter: {
              type: "array",
              contains: {
                anyOf: [
                  { const: "VerifiableAuthorisationForTrustChain" },
                  { const: "VerifiableAccreditationToAttest" },
                  { const: "VerifiableAccreditationToAccredit" },
                ],
              },
            },
          },
        ],
      },
    },
  ],
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
};

export const TIR_WRITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "tir_write_presentation",
  name: "Any type of Verifiable Attestation",
  purpose: "Please present a valid Presentation signed by a Trusted Issuer.",
  input_descriptors: [],
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
};
