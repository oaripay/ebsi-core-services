import { describe, it, expect } from "vitest";
import { formatHashAlgorithms } from "./hash-algorithms.formatter.js";

describe("formatHashAlgorithms", () => {
  const hashAlgorithms = {
    items: [1, 2, 3],
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatHashAlgorithms(hashAlgorithms, page, pageSize, "", "?test=true"),
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
        next: `?page[after]=${page + 1}&page[size]=${pageSize}?test=true`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}?test=true`,
    });
  });
});
