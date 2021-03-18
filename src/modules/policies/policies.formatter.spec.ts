import { ethers } from "ethers";
import { formatPolicies } from "./policies.formatter";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatPolicies", () => {
  const policies = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: ["policy-1:with/specialChars", "policy-2", "policy-3"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getPolicies"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatPolicies(policies, page, pageSize, "")).toStrictEqual({
      items: [
        {
          policyId: "policy-1:with/specialChars",
          href: `/${encodeURIComponent("policy-1:with/specialChars")}`,
        },
        {
          policyId: "policy-2",
          href: "/policy-2",
        },
        {
          policyId: "policy-3",
          href: "/policy-3",
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
