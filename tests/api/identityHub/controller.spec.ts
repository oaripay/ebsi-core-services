import base64url from "base64url";
import Controller from "../../../src/api/identityHub/controller";
import IDHub from "../../../src/libs/identityHub/idHub";
import { IAttribute, IAttributeInput } from "../../../src/dtos/attributeInfo";

describe("controller test suite", () => {
  it("should return a list of IAttribute", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    jest.spyOn(IDHub.prototype, "getAttributes").mockResolvedValue([]);
    expect(await Controller.getAttributes(did)).toBeDefined();
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with a bad type encoded string", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const badType = ["a type"];
    await expect(
      Controller.getAttributesFiltered(did, badType as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should return a list of IAttribute filtered", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const types = encodeURIComponent(JSON.stringify(["a type"]));
    jest.spyOn(IDHub.prototype, "getAttributesFiltered").mockResolvedValue([]);
    expect(await Controller.getAttributesFiltered(did, types)).toBeDefined();
    jest.resetAllMocks();
  });

  it("should return a specific IAttribute", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attribute: IAttribute = {
      id: "some-id",
      type: ["some type"],
      name: "attribute name",
      hash,
      did,
      data: {
        base64: base64url.encode(JSON.stringify({ data: "some random data" })),
      },
    };
    jest.spyOn(IDHub.prototype, "getAttribute").mockResolvedValue(attribute);
    expect(await Controller.getAttribute(did, hash)).toBeDefined();
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with no attribute input id", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput = {
      type: ["some type"],
      name: "attribute name",
      data: {
        base64: base64url.encode(JSON.stringify({ data: "some random data" })),
      },
    };
    await expect(
      Controller.setAttribute(did, hash, attributeInput as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with no attribute input type", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput = {
      id: "some-id",
      name: "attribute name",
      data: {
        base64: base64url.encode(JSON.stringify({ data: "some random data" })),
      },
    };
    await expect(
      Controller.setAttribute(did, hash, attributeInput as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with no attribute input name", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput = {
      id: "some-id",
      type: ["some type"],
      data: {
        base64: base64url.encode(JSON.stringify({ data: "some random data" })),
      },
    };
    await expect(
      Controller.setAttribute(did, hash, attributeInput as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with no attribute input data", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput = {
      id: "some-id",
      type: ["some type"],
      name: "attribute name",
    };
    await expect(
      Controller.setAttribute(did, hash, attributeInput as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should throw a BadRequestError with no attribute input data base64", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput = {
      id: "some-id",
      type: ["some type"],
      name: "attribute name",
      data: {},
    };
    await expect(
      Controller.setAttribute(did, hash, attributeInput as any)
    ).rejects.toThrow("Bad Request");
    jest.resetAllMocks();
  });

  it("should return an upated IAttribute", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInput: IAttributeInput = {
      id: "some-id",
      type: ["some type"],
      name: "attribute name",
      data: {
        base64: base64url.encode(JSON.stringify({ data: "some random data" })),
      },
    };
    const attribute: IAttribute = {
      ...attributeInput,
      did,
      hash,
    };
    jest
      .spyOn(IDHub.prototype, "setAttribute")
      .mockResolvedValue({ attribute, newAttribute: true });
    expect(
      await Controller.setAttribute(did, hash, attributeInput)
    ).toBeDefined();
    jest.resetAllMocks();
  });
});
