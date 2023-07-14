import { describe, it, expect } from "@jest/globals";
import { ethers } from "ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { AsyncReturnType } from "@ebsiint-api/shared";
import { formatPolicies } from "./policies.formatter";

describe("formatPolicies", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const policies = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: ["my-policy-1", "my-policy-2", "my-policy-3"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<PolicyRegistry["getPolicyNames"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatPolicies(policies, page, pageSize, "")).toStrictEqual({
      items: [
        {
          policyName: "my-policy-1",
          href: `/my-policy-1`,
        },
        {
          policyName: "my-policy-2",
          href: "/my-policy-2",
        },
        {
          policyName: "my-policy-3",
          href: "/my-policy-3",
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
