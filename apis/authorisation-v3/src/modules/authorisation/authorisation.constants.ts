import { PresentationDefinition } from "../../shared/interfaces/pex";

export const OPENID_SCOPE = "openid";

export const CUSTOM_SCOPES = [
  "did_write",
  "tir_write",
  "generic_write",
] as const;

export const SUPPORTED_SCOPES = [OPENID_SCOPE, ...CUSTOM_SCOPES] as const;

export const GENERIC_WRITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "generic_write_presentation",
  name: "Any type of Verifiable Attestation",
  purpose: "Please present a valid Presentation signed by a Trusted Issuer.",
  input_descriptors: [],
  format: {
    jwt_vc: { alg: ["ES256"] },
    jwt_vp: { alg: ["ES256"] },
  },
};

export const TIR_WRITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "tir_write_presentation",
  input_descriptors: [
    {
      id: "tir_write_credential",
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

export const DID_WRITE_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: "did_write_presentation",
  input_descriptors: [
    {
      id: "did_write_credential",
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
