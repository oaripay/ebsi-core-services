import { ethers } from "ethers";
import { formatPolicies } from "./policies.formatter";
import { PolicyRegistry } from "../../contracts";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatPolicies", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const policies = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      ethers.BigNumber.from("1"),
      ethers.BigNumber.from("2"),
      ethers.BigNumber.from("3"),
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<PolicyRegistry["getPolicies"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatPolicies(policies, page, pageSize, "")).toStrictEqual({
      items: [
        {
          policyId: "1",
          href: `/1`,
        },
        {
          policyId: "2",
          href: "/2",
        },
        {
          policyId: "3",
          href: "/3",
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
