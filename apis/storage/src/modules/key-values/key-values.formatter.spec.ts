import { describe, it, expect } from "vitest";
import { formatKeys } from "./key-values.formatter.js";

describe("formatKeys", () => {
  it("should paginate the values returned by Cassandra", () => {
    expect.assertions(2);

    let currentPageToken = "";
    const nextPageToken = "abc";
    const pageSize = 2;

    const keys = ["key1", "key2", "key3"];

    // should ignore the currentPageToken if it's empty
    expect(
      formatKeys(
        keys,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: keys,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });

    currentPageToken = "cde";

    expect(
      formatKeys(
        keys,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: keys,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${currentPageToken}&page[size]=${pageSize}?test=true`,
    });
  });

  it("should return empty links if pageState is empty", () => {
    expect.assertions(1);

    const currentPageToken = "";
    const nextPageToken = ""; // pageState
    const pageSize = 2;

    const keys = ["key1", "key2", "key3"];

    // should ignore the currentPageToken if it's empty
    expect(
      formatKeys(
        keys,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: keys,
      links: {},
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });
  });
});
