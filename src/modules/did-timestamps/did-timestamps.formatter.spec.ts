import { multibase64Encode } from "../../shared/utils";
import { formatDidTimestamps } from "./did-timestamps.formatter";

describe("formatDidTimestamps", () => {
  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const didTimestamps = {
      items: [
        "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00",
        "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb",
        "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269",
      ],
      total: 42,
    };

    const page = 3;
    const pageSize = 2;

    expect(
      formatDidTimestamps(didTimestamps, page, pageSize, "")
    ).toStrictEqual({
      items: [
        {
          timestampId: multibase64Encode(
            "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00"
          ),
          href: `/${multibase64Encode(
            "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00"
          )}`,
        },
        {
          timestampId: multibase64Encode(
            "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb"
          ),
          href: `/${multibase64Encode(
            "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb"
          )}`,
        },
        {
          timestampId: multibase64Encode(
            "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269"
          ),
          href: `/${multibase64Encode(
            "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269"
          )}`,
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

  // When getDidDocumentVersionDidTimestampIds is used
  it("should filter the results and include the identifier and version ID in the response", () => {
    expect.assertions(1);

    const didTimestamps = {
      items: [
        "0x535e508bfc78dc7f3ea88e5360db61883a9df528aa5c9f8a33d71cd0e40a5c00",
        "0x72866048a2ae1b63c0068b720e390c829671e3d34536c956ebb1500b82dadbfb",
        "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269",
      ],
      total: 3,
    };

    const page = 3;
    const pageSize = 1;
    const identifier = "0x1234";
    const versionId = 1;

    expect(
      formatDidTimestamps(
        didTimestamps,
        page,
        pageSize,
        "",
        identifier,
        versionId
      )
    ).toStrictEqual({
      items: [
        {
          timestampId: multibase64Encode(
            "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269"
          ),
          href: `/${multibase64Encode(
            "0xc260b7e206dee85b3e820570e6baceba29f7421b45a4a8b7b16ce01f71767269"
          )}`,
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}&identifier=${identifier}&version-id=${versionId}`,
        last: `?page[after]=3&page[size]=${pageSize}&identifier=${identifier}&version-id=${versionId}`,
        next: `?page[after]=3&page[size]=${pageSize}&identifier=${identifier}&version-id=${versionId}`,
        prev: `?page[after]=2&page[size]=${pageSize}&identifier=${identifier}&version-id=${versionId}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}&identifier=${identifier}&version-id=${versionId}`,
      total: 3,
    });
  });
});
