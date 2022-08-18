import { formatStores } from "./stores.formatter";
import { STORES } from "./stores.constants";

describe("formatStores", () => {
  it("should paginate the list of stores", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    const stores = STORES.slice((page - 1) * pageSize, page * pageSize);

    expect(
      formatStores(stores, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: stores,
      links: {
        first: `?page[after]=1&page[size]=${pageSize}?test=true`,
        prev: `?page[after]=${Math.min(
          page - 1,
          Math.ceil(STORES.length / pageSize)
        )}&page[size]=${pageSize}?test=true`,
        next: `?page[after]=${Math.min(
          page + 1,
          Math.ceil(STORES.length / pageSize)
        )}&page[size]=${pageSize}?test=true`,
        last: `?page[after]=${Math.ceil(
          STORES.length / pageSize
        )}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}?test=true`,
      total: STORES.length,
    });
  });
});
