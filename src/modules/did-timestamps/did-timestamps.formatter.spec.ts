import { ethers } from "ethers";
import { formatDidTimestamps } from "./did-timestamps.formatter";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatDidTimestamps", () => {
  const didTimestamps = {
    prev: ethers.BigNumber.from("1"),
    next: ethers.BigNumber.from("3"),
    items: [
      "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00",
      "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb",
      "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269",
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("3"),
  } as AsyncReturnType<DidRegistry["getDidTimestamps"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatDidTimestamps(didTimestamps, page, pageSize, "")
    ).toStrictEqual({
      items: [
        {
          timestampId:
            "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00",
          href:
            "/0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00",
        },
        {
          timestampId:
            "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb",
          href:
            "/0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb",
        },
        {
          timestampId:
            "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269",
          href:
            "/0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269",
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
