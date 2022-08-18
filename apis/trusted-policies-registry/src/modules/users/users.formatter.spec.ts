import { ethers } from "ethers";
import { formatUsers } from "./users.formatter";
import { PolicyRegistry } from "../../contracts";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatUsers", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const users = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: ["0x123456", "0xab1234", "0xcd1234"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<PolicyRegistry["getPolicyNames"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatUsers(users, page, pageSize, "")).toStrictEqual({
      items: [
        {
          address: "0x123456",
          href: `/0x123456`,
        },
        {
          address: "0xab1234",
          href: "/0xab1234",
        },
        {
          address: "0xcd1234",
          href: "/0xcd1234",
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
