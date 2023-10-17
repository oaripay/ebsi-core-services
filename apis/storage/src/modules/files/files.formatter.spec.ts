import { describe, it, expect } from "vitest";
import { formatFiles } from "./files.formatter.js";

describe("formatFiles", () => {
  it("should paginate the values returned by Cassandra", () => {
    expect.assertions(2);

    let currentPageToken = "";
    const nextPageToken = "abc";
    const pageSize = 2;

    const hashes = [
      "0x0355a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b04555",
      "0x4234a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b044df",
      "0xd2a69e5339bd87d7006400c4ab15dad9d8dee752142924fd0a0b637e7d2d63fe",
    ];

    // should ignore the currentPageToken if it's empty
    expect(
      formatFiles(
        hashes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: hashes,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });

    currentPageToken = "cde";

    expect(
      formatFiles(
        hashes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: hashes,
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

    const hashes = [
      "0x0355a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b04555",
      "0x4234a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b044df",
      "0xd2a69e5339bd87d7006400c4ab15dad9d8dee752142924fd0a0b637e7d2d63fe",
    ];
    // should ignore the currentPageToken if it's empty
    expect(
      formatFiles(
        hashes,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        "?test=true",
      ),
    ).toStrictEqual({
      items: hashes,
      links: {},
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });
  });
});
