import { describe, it, expect } from "@jest/globals";
import { formatAttributes } from "./attributes.formatter";
import { AttributeResponseObject } from "./attributes.interface";

const attributes: AttributeResponseObject[] = [
  {
    hash: "0x123456",
    storageUri: "https://storage",
    did: "did:ebsi:0x1234",
    data: "encrypted1",
    dataLabel: "document",
    contentType: "application/json+ld",
  },
  {
    hash: "0x234567",
    storageUri: "https://storage",
    did: "did:ebsi:0x2345",
    data: "encrypted2",
    dataLabel: "document",
    contentType: "application/json+ld",
  },
  {
    hash: "0x345678",
    storageUri: "https://storage",
    did: "did:ebsi:0x3456",
    data: "encrypted3",
    dataLabel: "document",
    contentType: "application/json+ld",
  },
];

describe("formatAttributes", () => {
  it("should paginate the values returned by Cassandra", () => {
    expect.assertions(2);

    let currentPageToken = "";
    const nextPageToken = "abc";
    const pageSize = 2;

    // should ignore the currentPageToken if it's empty
    expect(
      formatAttributes(
        attributes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true"
      )
    ).toStrictEqual({
      items: attributes,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });

    currentPageToken = "cde";

    expect(
      formatAttributes(
        attributes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true"
      )
    ).toStrictEqual({
      items: attributes,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${currentPageToken}&page[size]=${pageSize}?test=true`,
    });
  });

  it("should return empty links if pageState is empty", () => {
    expect.assertions(1);

    const currentPageToken = "";
    const nextPageToken = ""; // pageState
    const pageSize = 2;

    // should ignore the currentPageToken if it's empty
    expect(
      formatAttributes(
        attributes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true"
      )
    ).toStrictEqual({
      items: attributes,
      links: {},
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });
  });
});
