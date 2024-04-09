import { describe, it, expect } from "vitest";
import { formatIdentifiers } from "./identifiers.formatter.js";
import { Documents } from "./identifiers.interface.js";

describe("formatIdentifiers", () => {
  const identifiers = {
    identifiers: [
      "did:ebsi:z224tCapjMEJEdLU6n1iG2yH",
      "did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE",
      "did:ebsi:zjNQGmQjYQ6Wo3o5A7QnjR9",
    ],
    nextPageIdentifiers: [],
    prevPageIdentifiers: [],
  } as Documents;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatIdentifiers(
        identifiers.identifiers,
        page,
        pageSize,
        "",
        identifiers.prevPageIdentifiers,
        identifiers.nextPageIdentifiers,
      ),
    ).toStrictEqual({
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
        next: `?page[size]=${pageSize}`,
        prev: `?page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
    });
  });
});
