import { formatSmartContracts } from "./smart-contracts.formatter";
import { SmartContractInfoIdsList } from "./smart-contracts.interface";

describe("formatSmartContracts", () => {
  const smartContracts: SmartContractInfoIdsList = {
    items: ["sc-id", "sc-id-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const name = "test";

    expect(
      formatSmartContracts(smartContracts, page, pageSize, "", name)
    ).toStrictEqual({
      items: [
        {
          smartContractInfoId: "sc-id",
          href: "/sc-id",
        },
        {
          smartContractInfoId: "sc-id-2",
          href: "/sc-id-2",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}&name=${name}`,
        last: `?page[after]=21&page[size]=${pageSize}&name=${name}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}&name=${name}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}&name=${name}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}&name=${name}`,
      total: 42,
    });
  });
});
