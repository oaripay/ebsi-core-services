import type { Tir } from "@ebsiint-sc/trusted-issuers-registry-v3";

import { describe, expect, it } from "vitest";

import type { AttributeObject } from "./issuers.interface.ts";

import {
  formatAttributes,
  formatIssuers,
  formatProxies,
} from "./issuers.formatter.ts";

describe("formatIssuers", () => {
  const issuers = {
    howMany: 3n,
    items: ["0x001", "0x002", "0x003"],
    next: 3n,
    prev: 1n,
    total: 42n,
  } as Awaited<ReturnType<Tir["getIssuers"]>>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatIssuers(issuers, page, pageSize, "")).toStrictEqual({
      items: [
        {
          did: "0x001",
          href: "/0x001",
        },
        {
          did: "0x002",
          href: "/0x002",
        },
        {
          did: "0x003",
          href: "/0x003",
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

describe("formatAttributes", () => {
  const attributes: AttributeObject[] = [
    {
      body: "abc",
      hash: "0x001",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x002",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x003",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x004",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x005",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x006",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x007",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x008",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x009",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00A",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00B",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00C",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00D",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00E",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
    {
      body: "abc",
      hash: "0x00F",
      issuerType: "TI",
      rootTao: "did:ebsi:123",
      tao: "did:ebsi:123",
    },
  ];

  it("should display only the first 2 items", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 2;

    expect(formatAttributes(attributes, page, 2, "")).toStrictEqual({
      items: [
        {
          href: `/${attributes[0]!.hash}`,
          id: attributes[0]!.hash,
        },
        {
          href: `/${attributes[1]!.hash}`,
          id: attributes[1]!.hash,
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=2&page[size]=${pageSize}`,
        prev: `?page[after]=1&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: attributes.length,
    });
  });

  it("should display the last page", () => {
    expect.assertions(1);

    const page = 8;
    const pageSize = 2;

    expect(formatAttributes(attributes, page, pageSize, "")).toStrictEqual({
      items: [
        {
          href: `/${attributes[14]!.hash}`,
          id: attributes[14]!.hash,
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=8&page[size]=${pageSize}`,
        prev: `?page[after]=7&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: attributes.length,
    });
  });

  it("should display the third page", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatAttributes(attributes, page, pageSize, "")).toStrictEqual({
      items: [
        {
          href: `/${attributes[4]!.hash}`,
          id: attributes[4]!.hash,
        },
        {
          href: `/${attributes[5]!.hash}`,
          id: attributes[5]!.hash,
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=4&page[size]=${pageSize}`,
        prev: `?page[after]=2&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: attributes.length,
    });
  });
});

describe("formatProxies", () => {
  const proxies = {
    howMany: 2n,
    items: ["0xProxy1", "0xProxy2"],
    total: 2n,
  } as Awaited<ReturnType<Tir["getIssuerProxies"]>>;
  const baseUrl = "";

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);
    const page = 1;
    const pageSize = 10;
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
        last: `?page[after]=1&page[size]=${pageSize}`,
        next: `?page[after]=1&page[size]=${pageSize}`,
        prev: `?page[after]=1&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 2,
    });
  });
});
