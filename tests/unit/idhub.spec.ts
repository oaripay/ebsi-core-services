import IDHub from "../../src/libs/identityHub/idHub";
import { AttributeInfoList, CASFile } from "../../src/models";
import {
  IAttribute,
  IAttributeInfo,
  IAttributeInfoList,
  IAttributeInput,
} from "../../src/dtos/attributeInfo";
import { util } from "../../src/utils";
import { AttributeDAO } from "../../src/daos/attribute";
import { BadRequestError } from "../../src/errors";

describe("identity Hub api suite", () => {
  it("should retun an IDHub instance", () => {
    expect.assertions(1);
    expect(IDHub.Instance).toBeInstanceOf(IDHub);
  });

  describe("getAttributes & getAttributesFiltered tests", () => {
    it("should return an empty array", async () => {
      expect.assertions(1);
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockRejectedValue(new Error("Request failed with status code 404"));
      jest
        .spyOn(AttributeInfoList.prototype, "insertValue")
        .mockResolvedValue([] as any);
      const response = await IDHub.Instance.getAttributes(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5"
      );
      expect(response).toStrictEqual([]);
      jest.restoreAllMocks();
    });

    it("should throw an error retrieving an info element", async () => {
      expect.assertions(1);
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockRejectedValue(new Error("Another error type"));

      await expect(
        IDHub.Instance.getAttributes(
          "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5"
        )
      ).rejects.toThrow("Another error type");
      jest.restoreAllMocks();
    });

    it("should return an array of one IAttribute", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttributeInfoList: IAttributeInfoList = {
        list: [iAttributeInfo],
      };
      const attributeDAO: AttributeDAO = {
        did: iAttributeInfo.did,
        data: iAttributeInfoList,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeDAO);
      jest
        .spyOn(CASFile.prototype, "get")
        .mockResolvedValue(util.b64EncodeUrl("some random data"));
      const response = await IDHub.Instance.getAttributes(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5"
      );
      expect(response).toStrictEqual([iAttribute]);
      jest.restoreAllMocks();
    });

    it("should return an array of one Attribute matching the filter as a string[]", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        ["a type"]
      );
      expect(response).toStrictEqual([iAttribute]);
      jest.restoreAllMocks();
    });

    it("should return an array of zero Attribute with an empty filter list", async () => {
      expect.assertions(1);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        []
      );
      expect(response).toStrictEqual([]);
      jest.restoreAllMocks();
    });

    it("should return an array of zero Attribute matching the filter as a string[][]", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        [["000"]]
      );
      expect(response).toStrictEqual([]);
      jest.restoreAllMocks();
    });

    it("should return an array of one Attribute matching the filter as a string[][]", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        [["another subtype"]]
      );
      expect(response).toStrictEqual([iAttribute2]);
      jest.restoreAllMocks();
    });

    it("should return an array of two Attribute matching the filter as a string[][]", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        [["a subtype"], ["another subtype"]]
      );
      expect(response).toStrictEqual([iAttribute, iAttribute2]);
      jest.restoreAllMocks();
    });

    it("should return an array of one Attribute matching the filter as a string[][] when one has a string type", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: "a string type",
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        [["a subtype"], ["another subtype"]]
      );
      expect(response).toStrictEqual([iAttribute2]);
      jest.restoreAllMocks();
    });

    it("should return an array of one Attribute matching the filter as a string[] when one has a string type", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: "a string type",
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        ["another subtype"]
      );
      expect(response).toStrictEqual([iAttribute2]);
      jest.restoreAllMocks();
    });

    it("should return an array of one Attribute (with a string type) matching the filter as a string[] when one has a string type", async () => {
      expect.assertions(1);
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: "a string type",
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttributeInfo2: IAttributeInfo = {
        id: "0001",
        type: ["another type", "another subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      const iAttribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttribute2: IAttribute = {
        ...iAttributeInfo2,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([iAttribute, iAttribute2]);
      const response = await IDHub.Instance.getAttributesFiltered(
        "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
        ["a string type"]
      );
      expect(response).toStrictEqual([iAttribute]);
      jest.restoreAllMocks();
    });
  });

  describe("getAttribute tests", () => {
    it("should return an attribute given a hash", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash,
        did,
      };
      const attribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([attribute]);
      const response = await IDHub.Instance.getAttribute(did, hash);
      expect(response).toMatchObject(attribute);
      jest.restoreAllMocks();
    });

    it("should throw NotFoundError with an empty attribute list", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest.spyOn(IDHub.prototype, "getAttributes").mockResolvedValue([]);
      await expect(IDHub.Instance.getAttribute(did, hash)).rejects.toThrow(
        "Not Found"
      );
      jest.restoreAllMocks();
    });

    it("should throw NotFoundError with a hash not found", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A359421000",
        did,
      };
      const attribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(IDHub.prototype, "getAttributes")
        .mockResolvedValue([attribute]);
      await expect(IDHub.Instance.getAttribute(did, hash)).rejects.toThrow(
        "Not Found"
      );
      jest.restoreAllMocks();
    });
  });

  describe("setAttribute tests", () => {
    it("should add a new attribute", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash,
        did,
      };
      const attribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const attributeInput: IAttributeInput = {
        id: iAttributeInfo.id,
        type: iAttributeInfo.type,
        name: iAttributeInfo.name,
        data: attribute.data,
      };
      const expectedResponse = {
        attribute,
        newAttribute: true,
      };
      jest.spyOn(CASFile.prototype, "insert").mockResolvedValue({
        hash,
        function: "keccak256",
      });
      jest
        .spyOn(AttributeInfoList.prototype, "insertElem")
        .mockResolvedValue({} as any);
      const response = await IDHub.Instance.setAttribute(
        did,
        hash,
        attributeInput
      );
      expect(response).toMatchObject(expectedResponse);
      jest.restoreAllMocks();
    });

    it("should return an exising attribute", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        hash,
        did,
      };
      const attribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const attributeInput: IAttributeInput = {
        id: iAttributeInfo.id,
        type: iAttributeInfo.type,
        name: iAttributeInfo.name,
        data: attribute.data,
      };
      const expectedResponse = {
        attribute,
        newAttribute: false,
      };
      jest.spyOn(CASFile.prototype, "insert").mockRejectedValue(
        new BadRequestError(BadRequestError.defaultTitle, {
          detail: "This file is already stored with name",
        })
      );
      jest.spyOn(IDHub.Instance, "getAttribute").mockResolvedValue(attribute);
      const response = await IDHub.Instance.setAttribute(
        did,
        hash,
        attributeInput
      );
      expect(response).toMatchObject(expectedResponse);
      jest.restoreAllMocks();
    });

    it("should throw an InternalError when no response is returned", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeInput: IAttributeInput = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(CASFile.prototype, "insert")
        .mockResolvedValue(undefined as any);
      await expect(
        IDHub.Instance.setAttribute(did, hash, attributeInput)
      ).rejects.toThrow("Internal Server Error");
      jest.restoreAllMocks();
    });

    it("should throw an InternalError when no hash is returned", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeInput: IAttributeInput = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest.spyOn(CASFile.prototype, "insert").mockResolvedValue({
        function: "keccak256",
      } as any);
      await expect(
        IDHub.Instance.setAttribute(did, hash, attributeInput)
      ).rejects.toThrow("Internal Server Error");
      jest.restoreAllMocks();
    });

    it("should throw an InternalError when hash returned differs from the one passed", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeInput: IAttributeInput = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest.spyOn(CASFile.prototype, "insert").mockResolvedValue({
        hash: "0xc9A8940Ab318d4d4631a86DcF9E0b9A359421400",
        function: "keccak256",
      });
      await expect(
        IDHub.Instance.setAttribute(did, hash, attributeInput)
      ).rejects.toThrow("Internal Server Error");
      jest.restoreAllMocks();
    });

    it("should throw an Error when a file could not be inserted", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeInput: IAttributeInput = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest
        .spyOn(CASFile.prototype, "insert")
        .mockRejectedValue(new Error("Houston we have a problem"));
      await expect(
        IDHub.Instance.setAttribute(did, hash, attributeInput)
      ).rejects.toThrow("Houston we have a problem");
      jest.restoreAllMocks();
    });

    it("should throw an InternalError when a file could not be inserted", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeInput: IAttributeInput = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "attribute name",
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      const iAttributeInfo: IAttributeInfo = {
        id: "0001",
        type: ["a type", "a subtype"],
        name: "random name",
        hash,
        did,
      };
      const attribute: IAttribute = {
        ...iAttributeInfo,
        data: {
          base64: util.b64EncodeUrl("some random data"),
        },
      };
      jest.spyOn(CASFile.prototype, "insert").mockRejectedValue(
        new BadRequestError(BadRequestError.defaultTitle, {
          detail: "This file is already stored with name",
        })
      );
      jest.spyOn(IDHub.Instance, "getAttribute").mockResolvedValue(attribute);
      await expect(
        IDHub.Instance.setAttribute(did, hash, attributeInput)
      ).rejects.toThrow("Internal Server Error");
      jest.restoreAllMocks();
    });
  });
});
