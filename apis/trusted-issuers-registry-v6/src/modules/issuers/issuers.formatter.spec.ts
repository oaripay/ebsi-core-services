import { describe, expect, it } from "vitest";

import {
  formatAttributes,
  formatIssuers,
  formatProxies,
} from "./issuers.formatter.ts";

describe("formatIssuers", () => {
  const issuers = { items: ["did1", "did2", "did3"] };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatIssuers(issuers, page, pageSize, "")).toStrictEqual({
      items: [
        {
          did: "did1",
          href: "/did1",
        },
        {
          did: "did2",
          href: "/did2",
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

describe("formatAttributes", () => {
  const attributes = { items: ["0x0001", "0x0002", "0x0003"] };

  it("should display only the first 2 items", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 2;

    expect(formatAttributes(attributes, page, 2, "")).toStrictEqual({
      items: [
        {
          href: "/0x0001",
          id: "0x0001",
        },
        {
          href: "/0x0002",
          id: "0x0002",
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

describe("formatProxies", () => {
  const proxies = { items: ["0xProxy1", "0xProxy2", "0xProxy3"] };
  const baseUrl = "";

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 2;

    expect(formatProxies(proxies, page, pageSize, baseUrl)).toStrictEqual({
      items: [
        {
          href: "/0xProxy1",
          proxyId: "0xProxy1",
        },
        {
          href: "/0xProxy2",
          proxyId: "0xProxy2",
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
