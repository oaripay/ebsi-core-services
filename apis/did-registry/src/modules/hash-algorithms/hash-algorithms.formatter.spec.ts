import { ethers } from "ethers";
import { DidRegistry } from "@ebsiint-sc/did-registry";
import { formatHashAlgorithms } from "./hash-algorithms.formatter";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatHashAlgorithms", () => {
  const hashAlgorithms = {
    items: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as AsyncReturnType<DidRegistry["getHashAlgorithms"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatHashAlgorithms(hashAlgorithms, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: [
        {
          hashAlgorithmId: 1,
          href: "/1",
        },
        {
          hashAlgorithmId: 2,
          href: "/2",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}?test=true`,
        last: `?page[after]=21&page[size]=${pageSize}?test=true`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}?test=true`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}?test=true`,
      total: 42,
    });
  });
});
