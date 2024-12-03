import { describe, expect, it } from "vitest";

import {
  formatDocumentAccesses,
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
  };

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
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
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
  };

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
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
    });
  });
});

describe("formatDocumentAccesses", () => {
  const accesses = {
    items: [
      {
        documentId:
          "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
        grantedBy: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
        permission: "creator" as const,
        subject: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
      },
      {
        documentId:
          "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
        grantedBy: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
        permission: "delegate" as const,
        subject: "did:ebsi:zhbiAY9JHxAxao5vGUCq2RT",
      },
      {
        documentId:
          "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
        grantedBy: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
        permission: "write" as const,
        subject: "did:ebsi:zhbiAY9JHxAxao5vGUCq2RT",
      },
    ],
  };

  it("should use filter the values returned by the DocumentsService", () => {
    expect.assertions(1);

    const pageSize = 2;

    // First page
    const page = 1;
    expect(formatDocumentAccesses(accesses, page, pageSize, "")).toStrictEqual({
      items: [
        {
          documentId:
            "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
          grantedBy: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
          permission: "creator",
          subject: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
        },
        {
          documentId:
            "0xd06f39f1b07bdb5040665111ca96c63b100165f8e06ab2787d273d25ad6bb169",
          grantedBy: "did:ebsi:zbymX5AX8D2ibRy6EgxQVEu",
          permission: "delegate",
          subject: "did:ebsi:zhbiAY9JHxAxao5vGUCq2RT",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        next: `?page[after]=2&page[size]=${pageSize}`,
        prev: `?page[after]=1&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
    });
  });
});
