import {
  formatApps,
  formatAuthorizations,
  formatPublicKeys,
} from "./apps.formatter";

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
          id: "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
          name: "app-1:with/specialChars",
          href: `/0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8`,
        },
        {
          id: "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
          name: "app-2",
          href: `/0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909`,
        },
        {
          id: "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
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

describe("formatPublicKeys", () => {
  const publicKeys = [
    "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
    "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
    "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
  ];

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const total = 42;

    expect(
      formatPublicKeys(publicKeys, total, page, pageSize, "")
    ).toStrictEqual({
      items: [
        {
          id: "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
          href: `/0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8`,
        },
        {
          id: "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
          href: `/0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909`,
        },
        {
          id: "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
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

describe("formatAuthorizations", () => {
  const authorizations = [
    {
      authorizationId:
        "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
      authorizedAppName: "app-1:with/specialChars",
    },
    {
      authorizationId:
        "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
      authorizedAppName: "app-2",
    },
    {
      authorizationId:
        "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
      authorizedAppName: "app-3",
    },
  ];

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const total = 42;

    expect(
      formatAuthorizations(authorizations, total, page, pageSize, "")
    ).toStrictEqual({
      items: [
        {
          authorizationId:
            "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8",
          requesterApplicationName: "app-1:with/specialChars",
          href: `/0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d09a8`,
        },
        {
          authorizationId:
            "0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909",
          requesterApplicationName: "app-2",
          href: `/0x3f571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d0909`,
        },
        {
          authorizationId:
            "0x24571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d091c",
          requesterApplicationName: "app-3",
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
