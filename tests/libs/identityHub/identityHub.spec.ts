import IDHub from "../../../src/libs/identityHub/idHub";
import AttributeInfoList from "../../../src/models/attributeInfoList";
import {
  IAttribute,
  IAttributeInfo,
  IAttributeInfoList,
} from "../../../src/dtos/attributeInfo";
import { util } from "../../../src/utils";
import { AttributeDAO } from "../../../src/daos/attribute";
import CASFile from "../../../src/models/casFile";

describe("identity Hub api suite", () => {
  it("should retun an IDHub instance", () => {
    expect.assertions(1);
    expect(IDHub.Instance).toBeInstanceOf(IDHub);
  });

  describe("getAttributes tests", () => {
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
  });
});
