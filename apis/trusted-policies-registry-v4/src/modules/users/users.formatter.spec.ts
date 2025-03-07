import { describe, expect, it } from "vitest";

import { formatUsers } from "./users.formatter.ts";

describe("formatUsers", () => {
  const users = { items: ["0x123456", "0xab1234", "0xcd1234"] };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatUsers(users, page, pageSize, "")).toStrictEqual({
      items: [
        {
          href: `/0x123456`,
          user: "0x123456",
        },
        {
          href: "/0xab1234",
          user: "0xab1234",
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
