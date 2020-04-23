import fs from "fs";
import path from "path";
import { DataStoreManager } from "../../../src/libs/dataStorages";
import { CASFile } from "../../../src/models";
import { initSecureEnclave } from "../../auxAPICalls";
import { WALLET_DATA_STORE_TYPE } from "../../../src/config";
import { ICASFile } from "../../../src/daos/casFile";
import { ICASStorageOut } from "../../../src/dtos/dataStorage";
import { ICallResponse } from "../../../src/dtos/messages";

// Instantiate one of the CASFile Manager
const credCAS = DataStoreManager.Instance.credentialFileDB;
const testFilename2 = "swagger.pdf";
const testF2Hash =
  "0x4f50f224bb05e6c647d50da7a21617909bfef0c6ed65bf5068a66b8da266438d";
const testFilePath = "../data/documents/";

describe("cASFile model", () => {
  it("should return a CASFile empty object", () => {
    // Instantiate a CASFile DB
    expect.assertions(1);
    expect(credCAS).toBeInstanceOf(CASFile);
  });

  // TEST PASSES BUT FILE ALREADY STORED: SO COMMENTED UNTIL DELETE FILE STORE API CALL IS PROVIDED
  it("should return a successful insertion file to the Cassandra DataBase", async () => {
    expect.assertions(3);
    await initSecureEnclave();
    // Instantiate a CASFile DB
    const CASFileDB = CASFile.getInstance(
      WALLET_DATA_STORE_TYPE.CREDENTIALFILE_STORAGE,
      "cassandra"
    );
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
      message: "File stored",
      hash: testF2Hash,
    };

    const expectedDeleteResult: ICallResponse = {
      message: "File deleted",
    };
    await expect(() => CASFileDB.insert(iFile)).toThrow(
      "Request failed with status code 400"
    );
    // we then delete it
    const deleteResponse = <ICASStorageOut>await CASFileDB.delete(testF2Hash);
    expect(deleteResponse).toMatchObject(expectedDeleteResult);

    // and we insert again
    const insertResponse = <ICASStorageOut>await CASFileDB.insert(iFile);
    expect(insertResponse).toMatchObject(expectedInsertResult);
  });

  it.each(["cassandra"])(
    "should return a successful document from cassandra",
    async (database) => {
      // Instantiate a CASFile DB
      const CASFileDB = CASFile.getInstance(
        WALLET_DATA_STORE_TYPE.CREDENTIALFILE_STORAGE,
        database
      );
      const result = await CASFileDB.get(testF2Hash);

      const fileData = fs.readFileSync(
        path.join(__dirname, testFilePath + testFilename2),
        "utf-8"
      );
      expect(result).toBe(fileData);
    }
  );
});
