import { ethers } from "ethers";
import { DidRegistry } from "@ebsiint-sc/did-registry";
import { AsyncReturnType } from "@ebsiint-api/shared";
import {
  formatIdentifiers,
  formatVersions,
  formatMetadata,
} from "./identifiers.formatter";

describe("formatIdentifiers", () => {
  const identifiers = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      `0x${Buffer.from("did:ebsi:z224tCapjMEJEdLU6n1iG2yH").toString("hex")}`,
      `0x${Buffer.from("did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE").toString("hex")}`,
      `0x${Buffer.from("did:ebsi:zjNQGmQjYQ6Wo3o5A7QnjR9").toString("hex")}`,
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getDidRecordIdentifiers"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatIdentifiers(identifiers, page, pageSize, "")).toStrictEqual({
      items: [
        {
          did: "did:ebsi:z224tCapjMEJEdLU6n1iG2yH",
          href: "/did:ebsi:z224tCapjMEJEdLU6n1iG2yH",
        },
        {
          did: "did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE",
          href: "/did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE",
        },
        {
          did: "did:ebsi:zjNQGmQjYQ6Wo3o5A7QnjR9",
          href: "/did:ebsi:zjNQGmQjYQ6Wo3o5A7QnjR9",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=21&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 42,
    });
  });
});

describe("formatVersions", () => {
  const versions = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      "0x656273693a62657375",
      "0x656273693a626573752d74657374",
      "0x656273693a626573752d746573742d32",
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getDidDocumentVersionIds"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const validAt = new Date().toISOString();

    expect(formatVersions(versions, page, pageSize, "", validAt)).toStrictEqual(
      {
        items: [
          {
            versionId: "0x656273693a62657375",
            href: "/0x656273693a62657375",
          },
          {
            versionId: "0x656273693a626573752d74657374",
            href: "/0x656273693a626573752d74657374",
          },
          {
            versionId: "0x656273693a626573752d746573742d32",
            href: "/0x656273693a626573752d746573742d32",
          },
        ],
        links: {
          first: `?page[after]=1&page[size]=${pageSize}&valid-at=${validAt}`,
          last: `?page[after]=21&page[size]=${pageSize}&valid-at=${validAt}`,
          next: `?page[after]=${
            page + 1
          }&page[size]=${pageSize}&valid-at=${validAt}`,
          prev: `?page[after]=${
            page - 1
          }&page[size]=${pageSize}&valid-at=${validAt}`,
        },
        pageSize,
        self: `?page[after]=${page}&page[size]=${pageSize}&valid-at=${validAt}`,
        total: 42,
      }
    );
  });
});

describe("formatMetadata", () => {
  const metadata = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      "0x656273693a62657375",
      "0x656273693a626573752d74657374",
      "0x656273693a626573752d746573742d32",
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getDidDocumentVersionIds"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatMetadata(metadata, page, pageSize, "")).toStrictEqual({
      items: [
        {
          metadataId: "0x656273693a62657375",
          href: "/0x656273693a62657375",
        },
        {
          metadataId: "0x656273693a626573752d74657374",
          href: "/0x656273693a626573752d74657374",
        },
        {
          metadataId: "0x656273693a626573752d746573742d32",
          href: "/0x656273693a626573752d746573742d32",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=21&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 42,
    });
  });
});
