import { ethers } from "ethers";
import { formatAdministrators } from "./administrators.formatter";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatAdministrators", () => {
  const administrators = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: ["0x001", "0x002", "0x003"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getAdministrators"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatAdministrators(administrators, page, pageSize, "")
    ).toStrictEqual({
      items: [
        {
          did: "0x001",
          href: "/0x001",
        },
        {
          did: "0x002",
          href: "/0x002",
        },
        {
          did: "0x003",
          href: "/0x003",
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
