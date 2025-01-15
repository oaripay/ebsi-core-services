import type { EbsiVerifiableAttestation } from "@cef-ebsi/verifiable-credential";

import * as vcLib from "@cef-ebsi/verifiable-credential";
import Joi from "joi";
import { describe, expect, it, vi } from "vitest";

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
  credentialSchema: {
    id: "https://example.net",
    type: "FullJsonSchemaValidator2021",
  },
  credentialSubject: {
    encodedList:
      "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
    id: "https://example.net/creds/1#list",
    statusPurpose: "revocation",
    type: "StatusList2021",
  },
  id: "https://example.net/creds/1",
  issuanceDate: "2021-04-05T14:27:40Z",
  issued: "2021-04-05T14:27:40Z",
  issuer: "did:ebsi:example",
  type: ["VerifiableCredential", "StatusList2021Credential"],
  validFrom: "2021-04-05T14:27:40Z",
};

const validStatusListCredentialWithVerifiableAttestation: EbsiVerifiableAttestation =
  {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    credentialSchema: {
      id: "https://example.net",
      type: "FullJsonSchemaValidator2021",
    },
    credentialSubject: {
      encodedList:
        "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
      id: "https://example.net/creds/1#list",
      statusPurpose: "revocation",
      type: "StatusList2021",
    },
    id: "https://example.net/creds/1",
    issuanceDate: "2021-04-05T14:27:40Z",
    issued: "2021-04-05T14:27:40Z",
    issuer: "did:ebsi:example",
    type: [
      "VerifiableCredential",
      "VerifiableAttestation",
      "StatusList2021Credential",
    ],
    validFrom: "2021-04-05T14:27:40Z",
  };

describe("isStatusList2021Credential", () => {
  it("should return false when the credential is not a string", async () => {
    expect.assertions(1);

    await expect(
      isStatusList2021Credential(
        {
          not: "a string",
        },
        {
          hosts: ["example.net"],
          network: { name: "test" },
          scheme: "ebsi",
          services: {
            "did-registry": "v5",
            "trusted-issuers-registry": "v5",
            "trusted-policies-registry": "v3",
            "trusted-schemas-registry": "v3",
          },
        },
      ),
    ).resolves.toBe(false);
  });

  it("should return false when the credential JWT verification fails", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(() => {
      throw new Error("Invalid JWT");
    });

    await expect(
      isStatusList2021Credential("jwt", {
        hosts: ["example.net"],
        network: { name: "test" },
        scheme: "ebsi",
        services: {
          "did-registry": "v5",
          "trusted-issuers-registry": "v5",
          "trusted-policies-registry": "v3",
          "trusted-schemas-registry": "v3",
        },
      }),
    ).resolves.toBe(false);
  });

  it("should return false when the credential is not a valid StatusList2021Credential", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(() =>
      Promise.resolve({
        ...validStatusListCredential,

        type: ["VerifiableCredential", "InvalidStatusList2021Credential"],
      }),
    );

    await expect(
      isStatusList2021Credential("jwt", {
        hosts: ["example.net"],
        network: { name: "test" },
        scheme: "ebsi",
        services: {
          "did-registry": "v5",
          "trusted-issuers-registry": "v5",
          "trusted-policies-registry": "v3",
          "trusted-schemas-registry": "v3",
        },
      }),
    ).resolves.toBe(false);
  });

  it("should return true when the credential JWT verification succeeds", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(() =>
      Promise.resolve(validStatusListCredential),
    );

    await expect(
      isStatusList2021Credential("jwt", {
        hosts: ["example.net"],
        network: { name: "test" },
        scheme: "ebsi",
        services: {
          "did-registry": "v5",
          "trusted-issuers-registry": "v5",
          "trusted-policies-registry": "v3",
          "trusted-schemas-registry": "v3",
        },
      }),
    ).resolves.toBe(true);
  });

  it("should return true when the credential JWT verification succeeds (with VerifiableAttestation)", async () => {
    expect.assertions(1);

    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(() =>
      Promise.resolve(validStatusListCredentialWithVerifiableAttestation),
    );

    await expect(
      isStatusList2021Credential("jwt", {
        hosts: ["example.net"],
        network: { name: "test" },
        scheme: "ebsi",
        services: {
          "did-registry": "v5",
          "trusted-issuers-registry": "v5",
          "trusted-policies-registry": "v3",
          "trusted-schemas-registry": "v3",
        },
      }),
    ).resolves.toBe(true);
  });
});

describe("statusList2021CredentialSchema", () => {
  it("should not throw when asserting a valid object", () => {
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

  it("should throw an error when asserting an invalid object", () => {
    const invalidObject = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        // Missing context:
        // "https://w3id.org/vc/status-list/2021/v1",
      ],
      credentialSchema: {
        id: "https://example.net",
        type: "FullJsonSchemaValidator2021",
      },
      credentialSubject: {
        encodedList:
          "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
        id: "https://example.net/creds/1#list",
        // Invalid purpose
        statusPurpose: "invalid",
        type: "StatusList2021",
      },
      id: "https://example.net/creds/1",
      issuanceDate: "2021-04-05T14:27:40Z",
      issued: "2021-04-05T14:27:40Z",
      issuer: "did:ebsi:example",
      type: [
        // Invalid order: VerifiableCredential must be the first item
        "VerifiableAttestation",
        "VerifiableCredential",
        // "StatusList2021Credential" is missing
      ],
      validFrom: "2021-04-05T14:27:40Z",
    };

    expect(() =>
      Joi.assert(invalidObject, statusList2021CredentialSchema, {
        abortEarly: false,
      }),
    ).toThrowErrorMatchingSnapshot();
  });
});
