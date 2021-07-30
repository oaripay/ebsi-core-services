import { formatChannels } from "./fabric.formatter";

describe("formatChannels", () => {
  const channels: string[] = new Array(15)
    .fill(0)
    .map((val, index) => `ebsi-channel${index}`);

  it("should display only the first 2 items", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 2;

    expect(formatChannels(channels, page, 2, "")).toStrictEqual({
      items: [channels[0], channels[1]],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=2&page[size]=${pageSize}`,
        prev: `?page[after]=1&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: channels.length,
    });
  });

  it("should display the last page", () => {
    expect.assertions(1);

    const page = 8;
    const pageSize = 2;

    expect(formatChannels(channels, page, pageSize, "")).toStrictEqual({
      items: [channels[14]],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=8&page[size]=${pageSize}`,
        prev: `?page[after]=7&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: channels.length,
    });
  });

  it("should display the third page", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatChannels(channels, page, pageSize, "")).toStrictEqual({
      items: [channels[4], channels[5]],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=8&page[size]=${pageSize}`,
        next: `?page[after]=4&page[size]=${pageSize}`,
        prev: `?page[after]=2&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: channels.length,
    });
  });
});
