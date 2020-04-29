import fs from "fs";
import path from "path";
import { initSecureEnclave } from "../utils/auxAPICalls";
import { CASFile } from "../../src/models";
import { ICASFile } from "../../src/daos/casFile";
import { ICASStorageOut } from "../../src/dtos/dataStorage";
import DataStoreManager from "../../src/libs/dataStorages/dataStoreManager";

jest.setTimeout(100000);
const { credentialFileDB } = DataStoreManager.Instance;
const testFilename2 = "swagger.pdf";
const testF2Hash =
  "0x4f50f224bb05e6c647d50da7a21617909bfef0c6ed65bf5068a66b8da266438d";
const testFilePath = "../data/documents/";

describe("cASFile model", () => {
  it("should return a CASFile empty object", () => {
    expect.assertions(1);
    expect(credentialFileDB).toBeInstanceOf(CASFile);
  });

  // TEST PASSES BUT FILE ALREADY STORED: SO COMMENTED UNTIL DELETE FILE STORE API CALL IS PROVIDED
  it("should return a successful insertion file to the Cassandra DataBase", async () => {
    expect.assertions(2);
    await initSecureEnclave();
    const fileData = fs.readFileSync(
      path.join(__dirname, testFilePath + testFilename2),
      "utf-8"
    );

    const iFile: ICASFile = {
      fileData,
      fileName: testFilename2,
      database: "cassandra",
    };

    const expectedInsertResult: ICASStorageOut = {
      hash: testF2Hash,
      function: "keccak256",
    };

    await expect(credentialFileDB.insert(iFile)).rejects.toThrow(
      "Request failed with status code 400"
    );

    // we then delete it
    await credentialFileDB.delete(testF2Hash);

    // and we insert again
    const insertResponse = <ICASStorageOut>await credentialFileDB.insert(iFile);
    expect(insertResponse).toMatchObject(expectedInsertResult);
  });
});
