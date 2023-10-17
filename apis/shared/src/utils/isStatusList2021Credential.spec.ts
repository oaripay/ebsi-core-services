import { vi, describe, it, expect } from "vitest";
import * as vcLib from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiableAttestation } from "@cef-ebsi/verifiable-credential";
import Joi from "joi";
import {
  isStatusList2021Credential,
  statusList2021CredentialSchema,
} from "./isStatusList2021Credential.js";

vi.mock("@cef-ebsi/verifiable-credential", async () => {
  const mod = await vi.importActual<
    typeof import("@cef-ebsi/verifiable-credential")
  >("@cef-ebsi/verifiable-credential");
  // Return a mocked version so we can redefine property `verifyCredentialJwt` later
  return {
    ...mod,
  };
});

const validStatusListCredential: EbsiVerifiableAttestation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
  ],
  id: "https://example.net/creds/1",
  type: ["VerifiableCredential", "StatusList2021Credential"],
  issuer: "did:ebsi:example",
  issued: "2021-04-05T14:27:40Z",
  issuanceDate: "2021-04-05T14:27:40Z",
  validFrom: "2021-04-05T14:27:40Z",
  credentialSubject: {
    id: "https://example.net/creds/1#list",
    type: "StatusList2021",
    statusPurpose: "revocation",
    encodedList:
      "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
  },
  credentialSchema: {
    id: "https://example.net",
    type: "FullJsonSchemaValidator2021",
  },
};

const validStatusListCredentialWithVerifiableAttestation: EbsiVerifiableAttestation =
  {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    id: "https://example.net/creds/1",
    type: [
      "VerifiableCredential",
      "VerifiableAttestation",
      "StatusList2021Credential",
    ],
    issuer: "did:ebsi:example",
    issued: "2021-04-05T14:27:40Z",
    issuanceDate: "2021-04-05T14:27:40Z",
    validFrom: "2021-04-05T14:27:40Z",
    credentialSubject: {
      id: "https://example.net/creds/1#list",
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList:
        "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
    },
    credentialSchema: {
      id: "https://example.net",
      type: "FullJsonSchemaValidator2021",
    },
  };

describe("isStatusList2021Credential", () => {
  it("should return false when the credential is not a string", async () => {
    expect.assertions(1);

    await expect(
      isStatusList2021Credential(
        {
          not: "a string",
        },
        "example.net",
      ),
    ).resolves.toBe(false);
  });

  it("should return false when the credential JWT verification fails", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () =>
      Promise.reject(new Error("Invalid JWT")),
    );

    await expect(
      isStatusList2021Credential("jwt", "example.net"),
    ).resolves.toBe(false);
  });

  it("should return false when the credential is not a valid StatusList2021Credential", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () =>
      Promise.resolve({
        ...validStatusListCredential,
        ...{
          type: ["VerifiableCredential", "InvalidStatusList2021Credential"],
        },
      }),
    );

    await expect(
      isStatusList2021Credential("jwt", "example.net"),
    ).resolves.toBe(false);
  });

  it("should return true when the credential JWT verification succeeds", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () =>
      Promise.resolve(validStatusListCredential),
    );

    await expect(
      isStatusList2021Credential("jwt", "example.net"),
    ).resolves.toBe(true);
  });

  it("should return true when the credential JWT verification succeeds (with VerifiableAttestation)", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () =>
      Promise.resolve(validStatusListCredentialWithVerifiableAttestation),
    );

    await expect(
      isStatusList2021Credential("jwt", "example.net"),
    ).resolves.toBe(true);
  });
});

describe("statusList2021CredentialSchema", () => {
  it("should not throw when asserting a valid objet", () => {
    expect(() =>
      Joi.assert(validStatusListCredential, statusList2021CredentialSchema),
    ).not.toThrow();

    expect(() =>
      Joi.assert(
        validStatusListCredentialWithVerifiableAttestation,
        statusList2021CredentialSchema,
      ),
    ).not.toThrow();
  });

  it("should throw an error when asserting an invalid objet", () => {
    const invalidObject = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        // Missing context:
        // "https://w3id.org/vc/status-list/2021/v1",
      ],
      id: "https://example.net/creds/1",
      type: [
        // Invalid order: VerifiableCredential must be the first item
        "VerifiableAttestation",
        "VerifiableCredential",
        // "StatusList2021Credential" is missing
      ],
      issuer: "did:ebsi:example",
      issued: "2021-04-05T14:27:40Z",
      issuanceDate: "2021-04-05T14:27:40Z",
      validFrom: "2021-04-05T14:27:40Z",
      credentialSubject: {
        id: "https://example.net/creds/1#list",
        type: "StatusList2021",
        // Invalid purpose
        statusPurpose: "invalid",
        encodedList:
          "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
      },
      credentialSchema: {
        id: "https://example.net",
        type: "FullJsonSchemaValidator2021",
      },
    };

    expect(() =>
      Joi.assert(invalidObject, statusList2021CredentialSchema, {
        abortEarly: false,
      }),
    ).toThrowErrorMatchingSnapshot();
  });
});
