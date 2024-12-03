import { describe, expect, it } from "vitest";

import { contextSchema } from "./IsDidDocument.js";

describe("contextSchema", () => {
  it('should validate "https://www.w3.org/ns/did/v1"', () => {
    expect.assertions(1);

    const validation = contextSchema.validate("https://www.w3.org/ns/did/v1");

    expect(!validation.error).toBe(true);
  });

  it('should not validate any other string than "https://www.w3.org/ns/did/v1"', () => {
    expect.assertions(1);

    const validation = contextSchema.validate("https://www.w3.org/ns/did/v2");

    expect(!validation.error).toBe(false);
  });

  it('should validate an array of URIs with "https://www.w3.org/ns/did/v1" as first item', () => {
    expect.assertions(2);

    let validation = contextSchema.validate(["https://www.w3.org/ns/did/v1"]);

    expect(!validation.error).toBe(true);

    validation = contextSchema.validate([
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ]);

    expect(!validation.error).toBe(true);
  });

  it('should not validate an array of URIs when "https://www.w3.org/ns/did/v1" is not the first item', () => {
    expect.assertions(1);

    const validation = contextSchema.validate([
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://www.w3.org/ns/did/v1",
    ]);

    expect(!validation.error).toBe(false);
  });

  it('should not validate an array of strings when "https://www.w3.org/ns/did/v1" one of the strings is not a valid URI', () => {
    expect.assertions(1);

    const validation = contextSchema.validate([
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
      "invalid",
    ]);

    expect(!validation.error).toBe(false);
  });
});
