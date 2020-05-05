import { AttributeInfoList } from "../../src/models";
import { initSecureEnclave } from "../utils/auxAPICalls";
import DataStoreManager from "../../src/libs/dataStorages/dataStoreManager";
import {
  IAttributeInfo,
  IAttributeInfoList,
} from "../../src/dtos/attributeInfo";
import { hash } from "../../src/utils/util";

// Instantiate a AttributeInfoList DB
const { attributeInfoListDB } = DataStoreManager.Instance;

jest.setTimeout(1000000);

describe("iAttributeInfoList model", () => {
  it("should return a AttributeInfoList empty object", () => {
    expect.assertions(1);
    expect(attributeInfoListDB).toBeInstanceOf(AttributeInfoList);
  });

  it("should return a attributeInfoList inserted to the KeyValue DataBase, from one initial AttributeInfoList, and then delete the complete list", async () => {
    expect.assertions(2);
    await initSecureEnclave();
    const randNum: number = Math.floor(Math.random() * 1000000);
    const did = `0x${randNum}-testing`;
    const hashData1 = hash(JSON.stringify({ test: "sample" }));
    const attributeInfo: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential.pdf"],
      hash: hashData1,
      name: "test1",
      did,
    };

    const attributeInfoList: IAttributeInfoList = {
      list: [attributeInfo],
    };

    await attributeInfoListDB.insertValue({ did, data: attributeInfoList });
    const IAttributeInfoListOut = (await attributeInfoListDB.get(did)).data;
    expect(IAttributeInfoListOut).toStrictEqual(attributeInfoList);

    // deletes the inserted attributeInfoList
    await attributeInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(attributeInfoListDB.get(did)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });

  it("should ask for a attributeInfoList not inserted and throw error 400", async () => {
    expect.assertions(1);
    await initSecureEnclave();
    const did = "AAA-cred-0x0001";
    await expect(attributeInfoListDB.get(did)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });

  it("should update a attributeInfoList inserted to the KeyValue DataBase, and then deletes it", async () => {
    expect.assertions(3);
    await initSecureEnclave();
    const randNum: number = Math.floor(Math.random() * 1000000);
    const did = `0x${randNum}-testing`;
    const hashData1 = hash(JSON.stringify({ test: "sample" }));
    const attributeInfo: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential.pdf"],
      hash: hashData1,
      name: "test1",
      did,
    };

    const attributeInfoList: IAttributeInfoList = {
      list: [attributeInfo],
    };

    await attributeInfoListDB.insertValue({ did, data: attributeInfoList });
    const attributeInfoListOut = (await attributeInfoListDB.get(did)).data;
    expect(attributeInfoListOut).toStrictEqual(attributeInfoList);

    const newData: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential2.pdf"],
      hash: attributeInfo.hash,
      name: "test2",
      did,
    };

    // finds the index of the element
    const index: number = attributeInfoListOut.list.findIndex(
      (x) => x.id === attributeInfo.id
    );
    // updates AttributeInfo List with the new value
    attributeInfoListOut.list[index] = newData;

    await attributeInfoListDB.updateValue({ did, data: attributeInfoListOut });
    const IAttributeInfoListOut2 = (await attributeInfoListDB.get(did)).data;
    expect(IAttributeInfoListOut2).toStrictEqual(attributeInfoListOut);

    // deletes the inserted attributeInfoList
    await attributeInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(attributeInfoListDB.get(did)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });

  it("should return a attributeInfo from a AttributeInfoList inserted to the KeyValue DataBase, and then deletes the AttributeInfo element and after the whole AttributeInfoLlist", async () => {
    expect.assertions(3);
    await initSecureEnclave();
    const randNum: number = Math.floor(Math.random() * 1000000);
    const did = `0x${randNum}-testing`;
    const hashData1 = hash(JSON.stringify({ test: `sample ${randNum}` }));
    const attrInfo: IAttributeInfo = {
      id: "attribute-001-testing",
      type: ["credential.pdf"],
      hash: hashData1,
      name: "test1",
      did,
    };

    // insert element
    await attributeInfoListDB.insertElem(did, attrInfo);
    const { attributeInfo } = await attributeInfoListDB.getElem(
      did,
      attrInfo.id
    );
    expect(attributeInfo).toStrictEqual(attrInfo);

    // delete element
    await attributeInfoListDB.deleteElem(did, attrInfo.id);
    // checks if it really deletes it
    await expect(attributeInfoListDB.getElem(did, attrInfo.id)).rejects.toThrow(
      expect.objectContaining({
        detail: `Attribute Info not found with this id: ${attrInfo.id}`,
      })
    );

    // delete the whole AttributeInfoList
    await attributeInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(attributeInfoListDB.get(did)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });
});
