import { describe, it, expect } from "vitest";
import {
  formatSchemas,
  formatSchemaRevisions,
  formatSchemaRevisionMetadataList,
} from "./schemas.formatter.js";

describe("formatSchemas", () => {
  const schemas = { items: ["0x1234", "0x5678", "0xffaa"] };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatSchemas(schemas, page, pageSize, "")).toStrictEqual({
      items: [
        {
          schemaId: "z2PM",
          href: "/z2PM",
        },
        {
          schemaId: "z7af",
          href: "/z7af",
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

describe("formatSchemaRevisions", () => {
  const schemaRevisions = { items: ["rev-id", "rev-id-2", "rev-id-3"] };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(2);

    const page = 3;
    const pageSize = 2;

    expect(
      formatSchemaRevisions(schemaRevisions, page, pageSize, ""),
    ).toStrictEqual({
      items: [
        {
          schemaRevisionId: "rev-id",
          href: "/rev-id",
        },
        {
          schemaRevisionId: "rev-id-2",
          href: "/rev-id-2",
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

    // With "valid-at" in the query
    const validAt = new Date().toISOString();

    expect(
      formatSchemaRevisions(
        schemaRevisions,
        page,
        pageSize,
        "",
        `&valid-at=${validAt}`,
      ),
    ).toStrictEqual({
      items: [
        {
          schemaRevisionId: "rev-id",
          href: "/rev-id",
        },
        {
          schemaRevisionId: "rev-id-2",
          href: "/rev-id-2",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}&valid-at=${validAt}`,
        next: `?page[after]=${
          page + 1
        }&page[size]=${pageSize}&valid-at=${validAt}`,
        prev: `?page[after]=${
          page - 1
        }&page[size]=${pageSize}&valid-at=${validAt}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}&valid-at=${validAt}`,
    });
  });
});

describe("formatSchemaRevisionMetadataList", () => {
  const metadata = { items: ["meta-id", "meta-id-2", "meta-id-3"] };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatSchemaRevisionMetadataList(metadata, page, pageSize, ""),
    ).toStrictEqual({
      items: [
        {
          metadataId: "meta-id",
          href: "/meta-id",
        },
        {
          metadataId: "meta-id-2",
          href: "/meta-id-2",
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
