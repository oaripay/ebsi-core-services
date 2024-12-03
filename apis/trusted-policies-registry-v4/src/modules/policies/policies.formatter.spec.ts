import { describe, expect, it } from "vitest";

import { formatPolicies } from "./policies.formatter.js";

describe("formatPolicies", () => {
  const policies = {
    items: ["my-policy-1", "my-policy-2", "my-policy-3"],
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatPolicies(policies, page, pageSize, "")).toStrictEqual({
      items: [
        {
          href: `/my-policy-1`,
          policyName: "my-policy-1",
        },
        {
          href: "/my-policy-2",
          policyName: "my-policy-2",
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
