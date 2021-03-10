import { formatSchemas } from "./schemas.formatter";
import { SchemasList } from "./schemas.interface";

describe("formatSchemas", () => {
  const schemas: SchemasList = {
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
