import { ethers } from "ethers";
import { formatIdentifiers, formatVersions } from "./identifiers.formatter";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatIdentifiers", () => {
  const didMethods = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      `0x${Buffer.from("ebsi:besu").toString("hex")}`,
      `0x${Buffer.from("ebsi:besu-test").toString("hex")}`,
      `0x${Buffer.from("ebsi:besu-test-2").toString("hex")}`,
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getDidRecordIdentifiers"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatIdentifiers(didMethods, page, pageSize, "")).toStrictEqual({
      items: [
        {
          did: "ebsi:besu",
          href: "/ebsi:besu",
        },
        {
          did: "ebsi:besu-test",
          href: "/ebsi:besu-test",
        },
        {
          did: "ebsi:besu-test-2",
          href: "/ebsi:besu-test-2",
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
  const didMethods = {
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

    expect(
      formatVersions(didMethods, page, pageSize, "", validAt)
    ).toStrictEqual({
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
    });
  });
});
