import { describe, it, expect } from "vitest";
import { isBaseDocument } from "./IsBaseDocument.js";

describe("IsBaseDocument", () => {
  it("should validate if it is a valid base document", () => {
    // bad context
    expect(isBaseDocument("")).toStrictEqual({
      success: false,
      error: "baseDocument must be a stringified JSON document",
    });
    expect(isBaseDocument("bad-context")).toStrictEqual({
      success: false,
      error: "baseDocument must be a stringified JSON document",
    });
    expect(isBaseDocument("{}")).toStrictEqual({
      success: false,
      error: "'@context' attribute is missing",
    });
    expect(isBaseDocument('{"noContext":"bad"}')).toStrictEqual({
      success: false,
      error: "'@context' attribute is missing",
    });
    expect(isBaseDocument('{"@context":""}')).toStrictEqual({
      success: false,
      error: "'@context' attribute is missing",
    });
    expect(isBaseDocument('{"@context":[]}')).toStrictEqual({
      success: false,
      error:
        "'@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
    });
    expect(isBaseDocument('{"@context":["bad-context"]}')).toStrictEqual({
      success: false,
      error:
        "'@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
    });

    // good context
    expect(
      isBaseDocument('{"@context":"https://www.w3.org/ns/did/v1"}'),
    ).toStrictEqual({ success: true });
    expect(
      isBaseDocument('{"@context":["https://www.w3.org/ns/did/v1"]}'),
    ).toStrictEqual({ success: true });
    expect(
      isBaseDocument(
        '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}',
      ),
    ).toStrictEqual({ success: true });

    // no restricted fields (singular)
    expect(
      isBaseDocument(
        '{"@context":["https://www.w3.org/ns/did/v1"],"controller":"did:ebsi:z25jWQYxVzeL2z2fiYesZj9M"}',
      ),
    ).toStrictEqual({
      success: false,
      error: "attribute 'controller' is not allowed",
    });

    // no restricted fields (plural)
    expect(
      isBaseDocument(
        '{"@context":["https://www.w3.org/ns/did/v1"],"controller":"did:ebsi:z25jWQYxVzeL2z2fiYesZj9M", "id": "0x00"}',
      ),
    ).toStrictEqual({
      success: false,
      error: "attributes 'id', 'controller' are not allowed",
    });
  });
});
