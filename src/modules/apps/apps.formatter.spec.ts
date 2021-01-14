import { formatApps } from "./apps.formatter";

describe("formatApps", () => {
  const apps = [
    {
      applicationId:
        "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
      name: "app-1:with/specialChars",
    },
    {
      applicationId:
        "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
      name: "app-2",
    },
    {
      applicationId:
        "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
      name: "app-3",
    },
  ];

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const total = 42;

    expect(formatApps(apps, total, page, pageSize, "")).toStrictEqual({
      items: [
        {
          id:
            "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
          name: "app-1:with/specialChars",
          href: `/0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8`,
        },
        {
          id:
            "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
          name: "app-2",
          href: `/0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909`,
        },
        {
          id:
            "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
          name: "app-3",
          href: `/0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c`,
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
