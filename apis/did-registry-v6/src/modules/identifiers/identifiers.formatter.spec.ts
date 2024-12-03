import { describe, expect, it } from "vitest";

import { formatIdentifiers } from "./identifiers.formatter.js";

describe("formatIdentifiers", () => {
  const identifiers = {
    items: [
      "did:ebsi:z224tCapjMEJEdLU6n1iG2yH",
      "did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE",
      "did:ebsi:zjNQGmQjYQ6Wo3o5A7QnjR9",
      "did:ebsi:z253FPV3E4hkhfJexrj6mwTZ",
    ],
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 3;

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
        first: "?page[after]=1&page[size]=3",
        next: "?page[after]=4&page[size]=3",
        prev: "?page[after]=2&page[size]=3",
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
    });
  });
});
