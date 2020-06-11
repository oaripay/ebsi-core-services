import { paginate } from "../../src/utils";
import { mockedPosts } from "../utils/auxAPICalls";

describe("pagination tests", () => {
  it("should throw an error when no Array is passed", () => {
    expect.assertions(1);
    expect(() => paginate(null as any, "")).toThrow("");
  });

  it("should return a json with 10 elements", () => {
    expect.assertions(2);
    const json = paginate(mockedPosts, "");
    expect(json).toBeDefined();
    expect(json.items).toHaveLength(10);
  });

  it("should return a formated json with an empty items array", () => {
    expect.assertions(16);
    const baseUrl = "/test";
    const json = paginate([], baseUrl);
    expect(json).toBeDefined();
    expect(json.items).toHaveLength(0);
    expect(json).toHaveProperty("items");
    expect(json).toHaveProperty("total");
    expect(json.total).toBe(0);
    expect(json).toHaveProperty("pageSize");
    expect(json.pageSize).toBe(10);
    expect(json).toHaveProperty("links");
    expect(json.links).toHaveProperty("first");
    expect(json.links.first).toContain(baseUrl);
    expect(json.links).toHaveProperty("prev");
    expect(json.links.prev).toContain(baseUrl);
    expect(json.links).toHaveProperty("next");
    expect(json.links.next).toContain(baseUrl);
    expect(json.links).toHaveProperty("last");
    expect(json.links.last).toContain(baseUrl);
  });

  it("should return a json with 10 elements requesting more per page", () => {
    expect.assertions(2);
    const json = paginate(mockedPosts, "", 20);
    expect(json).toBeDefined();
    expect(json.items).toHaveLength(10);
  });

  it("should return a json with empty items when offset is greater than total items", () => {
    expect.assertions(2);
    const json = paginate(mockedPosts, "", 10, 20);
    expect(json).toBeDefined();
    expect(json.items).toHaveLength(0);
  });

  it("should return a formated json with 10 elements", () => {
    expect.assertions(14);
    const baseUrl = "/test";
    const json = paginate(mockedPosts, baseUrl);
    expect(json).toHaveProperty("items");
    expect(json).toHaveProperty("total");
    expect(json.total).toBe(10);
    expect(json).toHaveProperty("pageSize");
    expect(json.pageSize).toBe(10);
    expect(json).toHaveProperty("links");
    expect(json.links).toHaveProperty("first");
    expect(json.links.first).toContain(baseUrl);
    expect(json.links).toHaveProperty("prev");
    expect(json.links.prev).toContain(baseUrl);
    expect(json.links).toHaveProperty("next");
    expect(json.links.next).toContain(baseUrl);
    expect(json.links).toHaveProperty("last");
    expect(json.links.last).toContain(baseUrl);
  });
  it("should return a formated json with the first 5 elements", () => {
    expect.assertions(3);
    const baseUrl = "/test";
    const json = paginate(mockedPosts, baseUrl, 5);
    expect(json.items).toHaveLength(5);
    expect(json.items[0].id).toBe(1);
    expect(json.items[4].id).toBe(5);
  });
  it("should return a formatted json with the last 5 elements", () => {
    expect.assertions(3);
    const baseUrl = "/test";
    const json = paginate(mockedPosts, baseUrl, 5, 5);
    expect(json.items).toHaveLength(5);
    expect(json.items[0].id).toBe(6);
    expect(json.items[4].id).toBe(10);
  });
});
