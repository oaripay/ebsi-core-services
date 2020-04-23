import { DataStoreManager } from "../../../src/libs/dataStorages";
import { attributes } from "../../../src/dtos";
import { initSecureEnclave } from "../../auxAPICalls";
import { CredentialInfoList } from "../../../src/models";

// Instantiate a CredentialnfoList DB
const { credInfoListDB } = DataStoreManager.Instance;

jest.setTimeout(1000000);

describe("iCredentialInfoList model", () => {
  it("should return a CredentialInfoList empty object", () => {
    expect.assertions(1);
    expect(credInfoListDB).toBeInstanceOf(CredentialInfoList);
  });

  it("should return a credentialInfoList inserted to the KeyValue DataBase, from one initial CredentialInfoList, and then delete the complete list", async () => {
    expect.assertions(2);
    await initSecureEnclave();
    const iCredentialInfo: attributes.ICredentialInfo = {
      id: "cred001-testing",
      type: "credential.pdf",
      hash: "897872138472",
    };

    const iCredentialInfoList: attributes.ICredentialInfoList = {
      list: [iCredentialInfo],
    };

    const did = "0x0002-testing";

    await credInfoListDB.insert({ did, data: iCredentialInfoList });
    const iCredentialInfoListOut = (await credInfoListDB.get(did)).data;
    expect(iCredentialInfoListOut).toStrictEqual(iCredentialInfoList);

    // deletes the inserted credentialInfoList
    await credInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(() => credInfoListDB.get(did)).toThrow(
      "Request failed with status code 404"
    );
  });

  it("should ask for a credentialInfoList not inserted and throw error 400", async () => {
    expect.assertions(1);
    await initSecureEnclave();
    const did = "AAA-cred-0x0001";
    await expect(() => credInfoListDB.get(did)).toThrow(
      "Request failed with status code 404"
    );
  });

  it("should update a credentialInfoList inserted to the KeyValue DataBase, and then deletes it", async () => {
    expect.assertions(3);
    await initSecureEnclave();
    const iCredentialInfo: attributes.ICredentialInfo = {
      id: "cred001-testing",
      type: "credential.pdf",
      hash: "897872138472",
    };

    const iCredentialInfoList: attributes.ICredentialInfoList = {
      list: [iCredentialInfo],
    };

    const did = "0x0002-testing";

    await credInfoListDB.insert({ did, data: iCredentialInfoList });
    const iCredentialInfoListOut = (await credInfoListDB.get(did)).data;
    expect(iCredentialInfoListOut).toStrictEqual(iCredentialInfoList);

    const newData: attributes.ICredentialInfo = {
      id: "cred001-testing",
      type: "credential2.pdf",
      hash: "8000000000",
    };

    // finds the index of the element
    const index: number = iCredentialInfoListOut.list.findIndex(
      (x) => x.id === iCredentialInfo.id
    );
    // updates CredentialInfo List with the new value
    iCredentialInfoListOut.list[index] = newData;

    await credInfoListDB.update({ did, data: iCredentialInfoListOut });
    const iCredentialInfoListOut2 = (await credInfoListDB.get(did)).data;
    expect(iCredentialInfoListOut2).toStrictEqual(iCredentialInfoListOut);

    // deletes the inserted credentialInfoList
    await credInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(() => credInfoListDB.get(did)).toThrow(
      "Request failed with status code 404"
    );
  });

  it("should return a credentialInfo from a CredentialInfoList inserted to the KeyValue DataBase, and then deletes the CredentialInfo element and after the whole CredentialInfoLlist", async () => {
    expect.assertions(3);
    await initSecureEnclave();
    const randNum: number = Math.floor(Math.random() * 1000000);
    const iCredentialInfo: attributes.ICredentialInfo = {
      id: "cred001-testing",
      type: "credential.pdf",
      hash: "897872138472",
    };
    const did = `0x${randNum}-testing`;

    // insert element
    await credInfoListDB.insertElem(did, iCredentialInfo);
    const { iCredInfo } = await credInfoListDB.getElem(did, iCredentialInfo.id);
    expect(iCredInfo).toStrictEqual(iCredentialInfo);

    // delete element
    await credInfoListDB.deleteElem(did, iCredentialInfo.id);
    // checks if it really deletes it
    await expect(() => credInfoListDB.getElem(did, iCredentialInfo.id)).toThrow(
      `Credential Info not found with this id: ${iCredentialInfo.id}`
    );

    // delete the whole CredentialInfoList
    await credInfoListDB.delete(did);
    // checks if it really deletes it
    await expect(() => credInfoListDB.get(did)).toThrow(
      "Request failed with status code 404"
    );
  });
});
