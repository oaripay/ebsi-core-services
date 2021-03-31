import { ethers } from "ethers";
import { formatIdentifiers } from "./identifiers.formatter";
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
