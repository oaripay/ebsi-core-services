import { AttributeInfoList } from "../../src/models";
import { IAttributeInfo } from "../../src/dtos/attributeInfo";
import { WALLET_DATA_STORE_TYPE } from "../../src/config";
import KeyValueDataStorage from "../../src/libs/dataStorages/keyValueDataStorage";

describe("iAttributeInfoList model", () => {
  it("should return a AttributeInfoList empty object", () => {
    expect.assertions(1);
    const attributeInfoListDB = AttributeInfoList.getInstance(
      WALLET_DATA_STORE_TYPE.ATTRIBUTES_INFO_LIST_STORAGE
    );
    expect(attributeInfoListDB).toBeInstanceOf(AttributeInfoList);
  });

  it("should insert a value", async () => {
    expect.assertions(1);
    const attributeInfoListDB = AttributeInfoList.getInstance(
      WALLET_DATA_STORE_TYPE.ATTRIBUTES_INFO_LIST_STORAGE
    );
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInfo: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential.pdf"],
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

  it("should insert an element when no list exists", async () => {
    expect.assertions(1);
    const attributeInfoListDB = AttributeInfoList.getInstance(
      WALLET_DATA_STORE_TYPE.ATTRIBUTES_INFO_LIST_STORAGE
    );
    const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
    const hash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const attributeInfo: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential.pdf"],
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
});
