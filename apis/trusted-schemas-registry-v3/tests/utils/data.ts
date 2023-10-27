import crypto from "node:crypto";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";

export const createDid = (): string => EbsiWallet.createDid();

export const createSchema = () =>
  ({
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "EBSI Verifiable Attestation",
    description: "Schema of an EBSI Verifiable Attestation",
    type: "object",
    properties: {
      "@context": {
        description: "Defines semantic context of the Verifiable Attestation",
        type: "array",
        items: {
          type: "string",
          format: "uri",
        },
      },
      id: {
        description: "Defines unique identifier of the Verifiable Attestation",
        type: "string",
        format: "uri",
      },
      type: {
        description: "Defines the Verifiable Credential type",
        type: "array",
        items: {
          type: "string",
        },
      },
      issuer: {
        description: "Defines the issuer of the Verifiable Attestation",
        type: "string",
        format: "uri",
      },
      issuanceDate: {
        description:
          "Defines the date and time, when the Verifiable Attestation becomes valid",
        type: "string",
        format: "date-time",
      },
      validFrom: {
        description:
          "Defines the date and time, when the Verifiable Attestation becomes valid",
        type: "string",
        format: "date-time",
      },
      issued: {
        description: "Defines when the Verifiable Attestation was issued",
        type: "string",
        format: "date-time",
      },
      expirationDate: {
        description:
          "Defines the date and time, when the Verifiable Attestation expires",
        type: "string",
        format: "date-time",
      },
      credentialSubject: {
        description:
          "Defines information about the subject that is described by the Verifiable Attestation",
        type: "object",
        properties: {
          id: {
            description:
              "Defines the DID of the subject that is described by the Verifiable Attestation",
            type: "string",
            format: "uri",
          },
        },
        [`${crypto.randomBytes(16).toString("hex")}`]: {
          description: "Random property",
          type: "string",
        },
      },
      credentialStatus: {
        description:
          "Contains information about how to verify the status of the Verifiable Attestation (via the Revocation and Endorsement Registry, RER)",
        type: "object",
        properties: {
          id: {
            description:
              "References record in the Revocation and Endorsement Registry (RER) to enable verification of a Verifiable Attestation’s validity",
            type: "string",
            format: "uri",
          },
          type: {
            description: "Defines the Verifiable Credential status type",
            type: "string",
          },
        },
        required: ["id", "type"],
      },
      credentialSchema: {
        description:
          "Contains information about the credential schema (template) on which the Verifiable Authorisation is based",
        type: "object",
        properties: {
          id: {
            description:
              "References the credential schema (template) stored on the (relevant) Trusted Schemas Registry (TSR) on which the Verifiable Authorisation is based",
            type: "string",
            format: "uri",
          },
          type: {
            description: "Defines credential schema type",
            type: "string",
            enum: ["FullJsonSchemaValidator2021"],
          },
        },
        required: ["id", "type"],
      },
      evidence: {
        description:
          "Contains information about the process which resulted in the issuance of the Verifiable Attestation",
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              description:
                "If present, it MUST contain a URL that points to where more information about this instance of evidence can be found.",
              type: "string",
            },
            type: {
              description: "Defines the evidence type",
              type: "array",
              items: {
                type: "string",
              },
            },
            verifier: {
              description:
                "Defines entity which has verified documents before Verifiable Attestation issuance",
              type: "string",
            },
            evidenceDocument: {
              description:
                "Defines document(s) which have been verified before Verifiable Attestation issuance",
              type: "array",
              items: {
                type: "string",
              },
            },
            subjectPresence: {
              description:
                "Defines if the Verifiable Attestation subject was physically present in the course of the verification",
              type: "string",
            },
            documentPresence: {
              description:
                "Defines how the document(s) which have been verified before Verifiable Attestation issuance have been provided (e.g. physically, digitally)",
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: [
            "type",
            "verifier",
            "evidenceDocument",
            "subjectPresence",
            "documentPresence",
          ],
        },
      },
      proof: {
        description: "Contains information about the proof",
        type: "object",
        properties: {
          type: {
            description: "Defines the proof type",
            type: "string",
          },
          proofPurpose: {
            description: "Defines the purpose of the proof",
            type: "string",
          },
          created: {
            description:
              "Defines the date and time, when the proof has been created",
            type: "string",
            format: "date-time",
          },
          verificationMethod: {
            description:
              "Contains information about the verification method / proof mechanisms",
            type: "string",
          },
          jws: {
            description: "Defines the proof value in JWS format",
            type: "string",
          },
        },
        required: [
          "type",
          "proofPurpose",
          "created",
          "verificationMethod",
          "jws",
        ],
      },
    },
    required: [
      "@context",
      "id",
      "type",
      "issuer",
      "issuanceDate",
      "validFrom",
      "issued",
      "credentialSubject",
      "credentialSchema",
    ],
  }) satisfies JSONSchema;

export const createVerifiableAuthorisationSchema = (ref: string) =>
  ({
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "EBSI Verifiable Authorisation",
    description: "Schema of an EBSI Verifiable Authorisation",
    type: "object",
    allOf: [
      {
        $ref: ref,
      },
      {
        properties: {
          credentialSubject: {
            description:
              "Defines additional information about the subject that is described by the Verifiable Authorisation",
            type: "object",
            properties: {
              id: {
                description:
                  "Defines the DID of the subject that is described by the Verifiable Attestation",
                type: "string",
                format: "uri",
              },
              familyName: {
                description:
                  "Defines current family name(s) of the credential subject",
                type: "string",
              },
              firstName: {
                description:
                  "Defines current first name(s) of the credential subject",
                type: "string",
              },
              dateOfBirth: {
                description: "Defines date of birth of the credential subject",
                type: "string",
                format: "date",
              },
              personalIdentifier: {
                description:
                  "Defines the unique national identifier of the credential subject (constructed by the sending Member State in accordance with the technical specifications for the purposes of cross-border identification and which is as persistent as possible in time)",
                type: "string",
              },
              nameAndFamilyNameAtBirth: {
                description:
                  "Defines the first and the family name(s) of the credential subject at the time of their birth",
                type: "string",
              },
              placeOfBirth: {
                description:
                  "Defines the place where the credential subject is born",
                type: "string",
              },
              currentAddress: {
                description:
                  "Defines the current address of the credential subject",
                type: "string",
              },
              gender: {
                description: "Defines the gender of the credential subject",
                type: "string",
              },
              [`${crypto.randomBytes(16).toString("hex")}`]: {
                description: "Random property",
                type: "string",
              },
            },
            required: ["id"],
          },
        },
      },
    ],
    required: [
      "@context",
      "id",
      "type",
      "issuer",
      "issuanceDate",
      "validFrom",
      "credentialSubject",
      "credentialSchema",
    ],
  }) satisfies JSONSchema;
