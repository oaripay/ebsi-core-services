import { AttributeInfoList } from "../../src/models";
import { IAttributeInfo } from "../../src/dtos/attributeInfo";
import { WalletDataStoreType } from "../../src/config";
import KeyValueDataStorage from "../../src/libs/dataStorages/keyValueDataStorage";
import { BadRequestError } from "../../src/errors";

describe("iAttributeInfoList model", () => {
  it("should return a AttributeInfoList empty object", () => {
    expect.assertions(1);
    const attributeInfoListDB = AttributeInfoList.getInstance(
      WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
    );
    expect(attributeInfoListDB).toBeInstanceOf(AttributeInfoList);
  });

  describe("value API tests", () => {
    it("should insert a value", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const returnedAttr = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      jest
        .spyOn(KeyValueDataStorage.prototype, "insert")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.insertValue(attributeDAO);
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should update a value", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const returnedAttr = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      jest
        .spyOn(KeyValueDataStorage.prototype, "update")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.updateValue(attributeDAO);
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should delete a value", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest.spyOn(KeyValueDataStorage.prototype, "delete").mockResolvedValue();
      expect(() => attributeInfoListDB.delete(did)).not.toThrow();
      jest.resetAllMocks();
    });

    it("should get a value", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      jest
        .spyOn(KeyValueDataStorage.prototype, "get")
        .mockResolvedValue(attributeDAO.data);
      const response = await attributeInfoListDB.get(did);
      expect(response).toMatchObject(attributeDAO);
      jest.resetAllMocks();
    });
  });

  describe("elem API tests", () => {
    it("should get an element", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const returnedAttr = {
        index: 0,
        attributeInfo,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeDAO);
      const response = await attributeInfoListDB.getElem(did, attributeInfo.id);
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should throw BadRequestError when list is null", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const attributeDAO = {
        did,
        data: {
          list: [],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeDAO);
      await expect(attributeInfoListDB.getElem(did, "some id")).rejects.toThrow(
        "Bad Request"
      );
      jest.resetAllMocks();
    });

    it("should throw BadRequestError when not found", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeDAO);
      await expect(attributeInfoListDB.getElem(did, "some id")).rejects.toThrow(
        "Bad Request"
      );
      jest.resetAllMocks();
    });

    it("should insert an element when no list exists", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const returnedAttr = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockRejectedValue(new Error("Request failed with status code 404"));
      jest
        .spyOn(AttributeInfoList.prototype, "insertValue")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.insertElem(did, attributeInfo);
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should thorw an error when getting an element and there is an error", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockRejectedValue(new Error("Another error"));
      await expect(
        attributeInfoListDB.insertElem(did, attributeInfo)
      ).rejects.toThrow("Another error");
      jest.resetAllMocks();
    });

    it("should insert an element when a list exists but not the same AttributeInfo", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeInfo2: IAttributeInfo = {
        id: "attribute-002-testing",
        type: ["a type"],
        hash,
        name: "test2",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      const returnedAttr = {
        did: `attributes-${did}`,
        data: {
          list: [attributeInfo, attributeInfo2],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest.spyOn(AttributeInfoList.prototype, "getElem").mockRejectedValue(
        new BadRequestError(BadRequestError.defaultTitle, {
          detail: `Attribute Info not found with this id: ${attributeInfo2.id}`,
        })
      );
      jest
        .spyOn(AttributeInfoList.prototype, "insertValue")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.insertElem(
        did,
        attributeInfo2
      );
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should throw an element when a list exists but getting the AttributeInfo raises an error", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeInfo2: IAttributeInfo = {
        id: "attribute-002-testing",
        type: ["a type"],
        hash,
        name: "test2",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest
        .spyOn(AttributeInfoList.prototype, "getElem")
        .mockRejectedValue(new Error("another error"));
      await expect(
        attributeInfoListDB.insertElem(did, attributeInfo2)
      ).rejects.toThrow("another error");
      jest.resetAllMocks();
    });

    it("should throw an element when a list exists but getting the AttributeInfo raises an ProblemDetailsError with another message", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeInfo2: IAttributeInfo = {
        id: "attribute-002-testing",
        type: ["a type"],
        hash,
        name: "test2",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest.spyOn(AttributeInfoList.prototype, "getElem").mockRejectedValue(
        new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Bad parameters",
        })
      );
      await expect(
        attributeInfoListDB.insertElem(did, attributeInfo2)
      ).rejects.toThrow("Bad Request");
      jest.resetAllMocks();
    });

    it("should update an element when a list exists and AttributeInfo is the same", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeInfo2: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["another type"],
        hash,
        name: "test2",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      const returnedAttr = {
        did: `attributes-${did}`,
        data: {
          list: [attributeInfo2],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest
        .spyOn(AttributeInfoList.prototype, "getElem")
        .mockResolvedValue({ index: 0, attributeInfo });
      jest
        .spyOn(AttributeInfoList.prototype, "insertValue")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.insertElem(
        did,
        attributeInfo2
      );
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should update an element", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeInfo2: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["another type"],
        hash,
        name: "test2",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      const returnedAttr = {
        did,
        data: {
          list: [attributeInfo2],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest
        .spyOn(AttributeInfoList.prototype, "getElem")
        .mockResolvedValue({ index: 0, attributeInfo });
      jest
        .spyOn(AttributeInfoList.prototype, "updateValue")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.updateElem(
        did,
        attributeInfo2
      );
      expect(response).toMatchObject(returnedAttr);
      jest.resetAllMocks();
    });

    it("should delete an element", async () => {
      expect.assertions(1);
      const attributeInfoListDB = AttributeInfoList.getInstance(
        WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE
      );
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      const attributeInfo: IAttributeInfo = {
        id: "attribute-001-testing",
        type: ["a type"],
        hash,
        name: "test1",
        did,
      };
      const attributeDAO = {
        did,
        data: {
          list: [attributeInfo, attributeInfo],
        },
      };
      const attributeList = {
        did: `attributes-${did}`,
        data: attributeDAO.data,
      };
      const returnedAttr = {
        did,
        data: {
          list: [],
        },
      };
      jest
        .spyOn(AttributeInfoList.prototype, "get")
        .mockResolvedValue(attributeList);
      jest
        .spyOn(AttributeInfoList.prototype, "getElem")
        .mockResolvedValue({ index: 0, attributeInfo });
      jest
        .spyOn(AttributeInfoList.prototype, "insertValue")
        .mockResolvedValue(returnedAttr);
      const response = await attributeInfoListDB.deleteElem(
        did,
        attributeInfo.id
      );
      expect(response).not.toBeDefined();
      jest.resetAllMocks();
    });
  });
});
