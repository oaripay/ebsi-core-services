import { computePermissions } from "./jsonrpc.utils";

describe("computePermissions", () => {
  it("should return the expected results", () => {
    expect.assertions(16);

    expect(computePermissions("")).toStrictEqual(0);
    expect(computePermissions("d")).toStrictEqual(1);
    expect(computePermissions("u")).toStrictEqual(2);
    expect(computePermissions("ud")).toStrictEqual(3);
    expect(computePermissions("r")).toStrictEqual(4);
    expect(computePermissions("rd")).toStrictEqual(5);
    expect(computePermissions("ru")).toStrictEqual(6);
    expect(computePermissions("rud")).toStrictEqual(7);
    expect(computePermissions("c")).toStrictEqual(8);
    expect(computePermissions("cd")).toStrictEqual(9);
    expect(computePermissions("cu")).toStrictEqual(10);
    expect(computePermissions("cud")).toStrictEqual(11);
    expect(computePermissions("cr")).toStrictEqual(12);
    expect(computePermissions("crd")).toStrictEqual(13);
    expect(computePermissions("cru")).toStrictEqual(14);
    expect(computePermissions("crud")).toStrictEqual(15);
  });

  it("should not count the same letter twice", () => {
    expect.assertions(1);

    expect(computePermissions("cccc")).toStrictEqual(8);
  });

  it("should ignore other chars", () => {
    expect.assertions(1);
    expect(computePermissions("hello")).toStrictEqual(0);
  });
});
