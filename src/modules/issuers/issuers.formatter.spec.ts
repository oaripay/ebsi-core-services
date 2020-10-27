import { ethers } from "ethers";
import { formatIssuers, formatAttributes } from "./issuers.formatter";
import {
  AttributeObject,
  IssuersListSmartContractResponseObject,
} from "./issuers.interface";

describe("formatIssuers", () => {
  const issuers: IssuersListSmartContractResponseObject = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: ["0x001", "0x002", "0x003"],
    total: ethers.BigNumber.from("42"),
    pageSize: ethers.BigNumber.from("3"),
  };

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
    { hash: "0x001", body: "abc" },
    { hash: "0x002", body: "abc" },
    { hash: "0x003", body: "abc" },
    { hash: "0x004", body: "abc" },
    { hash: "0x005", body: "abc" },
    { hash: "0x006", body: "abc" },
    { hash: "0x007", body: "abc" },
    { hash: "0x008", body: "abc" },
    { hash: "0x009", body: "abc" },
    { hash: "0x00A", body: "abc" },
    { hash: "0x00B", body: "abc" },
    { hash: "0x00C", body: "abc" },
    { hash: "0x00D", body: "abc" },
    { hash: "0x00E", body: "abc" },
    { hash: "0x00F", body: "abc" },
  ];

  it("should display only the first 2 items", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 2;

    expect(formatAttributes(attributes, page, 2, "")).toStrictEqual({
      items: [
        {
          href: `/${attributes[0].hash}`,
          id: attributes[0].hash,
        },
        {
          href: `/${attributes[1].hash}`,
          id: attributes[1].hash,
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
          href: `/${attributes[14].hash}`,
          id: attributes[14].hash,
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
          href: `/${attributes[4].hash}`,
          id: attributes[4].hash,
        },
        {
          href: `/${attributes[5].hash}`,
          id: attributes[5].hash,
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
