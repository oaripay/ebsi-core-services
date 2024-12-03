import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { ethers } from "ethers";
import { describe, expect, it } from "vitest";

import { formatPolicies } from "./policies.formatter.js";

describe("formatPolicies", () => {
  const policies = {
    howMany: ethers.BigNumber.from("3"),
    items: ["my-policy-1", "my-policy-2", "my-policy-3"],
    next: ethers.BigNumber.from("3"),
    prev: ethers.BigNumber.from("1"),
    total: ethers.BigNumber.from("42"),
  } as Awaited<ReturnType<PolicyRegistry["getPolicyNames"]>>;

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
        {
          href: "/my-policy-3",
          policyName: "my-policy-3",
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
