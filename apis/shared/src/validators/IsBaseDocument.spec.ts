import { describe, it, expect } from "vitest";
import { isBaseDocument } from "./IsBaseDocument.js";

describe("IsBaseDocument", () => {
  it("should validate if it is a valid base document", () => {
    // bad context
    expect(isBaseDocument("")).toBeFalsy();
    expect(isBaseDocument("bad-context")).toBeFalsy();
    expect(isBaseDocument("{}")).toBeFalsy();
    expect(isBaseDocument('{"noContext":"bad"}')).toBeFalsy();
    expect(isBaseDocument('{"@context":""}')).toBeFalsy();
    expect(isBaseDocument('{"@context":[]}')).toBeFalsy();
    expect(isBaseDocument('{"@context":["bad-context"]}')).toBeFalsy();

    // good context
    expect(
      isBaseDocument('{"@context":"https://www.w3.org/ns/did/v1"}'),
    ).toBeTruthy();
    expect(
      isBaseDocument('{"@context":["https://www.w3.org/ns/did/v1"]}'),
    ).toBeTruthy();
    expect(
      isBaseDocument(
        '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}',
      ),
    ).toBeTruthy();

    // no restricted fields
    expect(
      isBaseDocument(
        '{"@context":["https://www.w3.org/ns/did/v1"],"controller":"did:ebsi:z25jWQYxVzeL2z2fiYesZj9M"}',
      ),
    ).toBeFalsy();
  });
});
