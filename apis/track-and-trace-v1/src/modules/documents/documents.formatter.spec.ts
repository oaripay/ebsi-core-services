import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import {
  formatDocumentEvents,
  formatDocuments,
} from "./documents.formatter.js";

describe("formatDocuments", () => {
  const documents = {
    items: [
      "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
      "0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
      "0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as Awaited<ReturnType<TrackAndTrace["getDocuments"]>>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatDocuments(documents, page, pageSize, "")).toStrictEqual({
      items: [
        {
          documentId:
            "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
          href: "/0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
        },
        {
          documentId:
            "0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
          href: "/0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
        },
        {
          documentId:
            "0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
          href: "/0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
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

describe("formatDocumentEvents", () => {
  const events = {
    items: [
      "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
      "0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
      "0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as Awaited<ReturnType<TrackAndTrace["getDocuments"]>>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatDocumentEvents(events, page, pageSize, "")).toStrictEqual({
      items: [
        {
          eventId:
            "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
          href: "/0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
        },
        {
          eventId:
            "0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
          href: "/0x99ab5f3cfc581c53a9210fc4588416fbc84b3ff09950ddc84e0efd1e2b2e147a",
        },
        {
          eventId:
            "0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
          href: "/0x4ed9c02a2c28de4ebfb274f8036d961062b05d8ea7a06682725d36224718e03e",
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
