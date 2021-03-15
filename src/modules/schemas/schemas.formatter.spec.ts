import {
  formatSchemas,
  formatSchemaRevisions,
  formatSchemaRevisionMetadataList,
} from "./schemas.formatter";
import { ItemsList } from "./schemas.interface";

describe("formatSchemas", () => {
  const schemas: ItemsList = {
    items: ["schema-id", "schema-id-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatSchemas(schemas, page, pageSize, "")).toStrictEqual({
      items: [
        {
          schemaId: "schema-id",
          href: "/schema-id",
        },
        {
          schemaId: "schema-id-2",
          href: "/schema-id-2",
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

describe("formatSchemaRevisions", () => {
  const schemaRevisions: ItemsList = {
    items: ["rev-id", "rev-id-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(2);

    const page = 3;
    const pageSize = 2;

    expect(
      formatSchemaRevisions(schemaRevisions, page, pageSize, "")
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
        last: `?page[after]=21&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 42,
    });

    // With "valid-at" in the query
    const validAt = new Date().toISOString();

    expect(
      formatSchemaRevisions(schemaRevisions, page, pageSize, "", validAt)
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
        last: `?page[after]=21&page[size]=${pageSize}&valid-at=${validAt}`,
        next: `?page[after]=${
          page + 1
        }&page[size]=${pageSize}&valid-at=${validAt}`,
        prev: `?page[after]=${
          page - 1
        }&page[size]=${pageSize}&valid-at=${validAt}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}&valid-at=${validAt}`,

      total: 42,
    });
  });
});

describe("formatSchemaRevisionMetadataList", () => {
  const metadata: ItemsList = {
    items: ["meta-id", "meta-id-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatSchemaRevisionMetadataList(metadata, page, pageSize, "")
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
