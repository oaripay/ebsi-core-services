/* eslint-disable jest/no-hooks */
import request from "supertest";
import http from "http";
import { startEbsiService } from "../../../src/api/app";
import { EBSI_SERVICE, EBSI_DEFAULT_DATA_STORE } from "../../../src/config";
import { EBSI_API_ERRORS_INT, BadRequestError } from "../../../src/errors";
import { initSetupForTesting, mockedAttributes } from "../../utils/auxAPICalls";
import { IAttributeInput } from "../../../src/dtos/attributeInfo";
import IDHub from "../../../src/libs/identityHub/idHub";
import { PaginateResult } from "../../../src/utils";
import { CASDataStorage } from "../../../src/libs/dataStorages";
import { ICASFile } from "../../../src/daos/casFile";

jest.setTimeout(1000000);

describe("wallet router API calls", () => {
  let server: http.Server;
  const testPort: number = 9900;
  let userToken: string;
  let userDid: string;

  beforeAll(async (done) => {
    // launch Server to test its RESTful API
    server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort,
      EBSI_SERVICE.SWAGGER_FULL_URL.IDHUB
    );

    const entitySetup = await initSetupForTesting();
    userToken = entitySetup.userToken;
    userDid = entitySetup.userDid;

    done();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  it("responds 404 to /", async () => {
    expect.assertions(1);
    const res = await request(server).get("/");
    expect(res.status).toStrictEqual(EBSI_API_ERRORS_INT.NOT_FOUND_404);
  });

  describe("identity hub endpoints (mocking IDHub class calls)", () => {
    it("should add a new attribute and return 201", async () => {
      expect.assertions(3);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = userDid;
      const spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      expect(res.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith(
        userDid,
        expectedResult.hash,
        attributeInput
      );
      spy.mockRestore();
    });

    it("should return 200 with an existing attribute", async () => {
      expect.assertions(4);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = userDid;
      let spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: false });
      // we add the same attribute again
      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith(
        userDid,
        expectedResult.hash,
        attributeInput
      );
      spy.mockRestore();
    });
    it("should returnn 401 with no token", async () => {
      expect.assertions(2);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;

      const expectedResult = {
        title: "Unauthorized",
        status: 401,
        detail: "You are not authorized to access the resources.",
      };
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(401);
      expect(res.body).toMatchObject(expectedResult);
    });

    it("should retrieve an existing attribute", async () => {
      expect.assertions(4);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = userDid;
      const spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      const spyGet = jest
        .spyOn(IDHub.prototype, "getAttribute")
        .mockResolvedValue(expectedResult);
      // we add the same attribute again
      const res2 = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spyGet).toHaveBeenCalledWith(userDid, expectedResult.hash);
      spy.mockRestore();
      spyGet.mockRestore();
    });

    describe("get attributes endpoint (mocked)", () => {
      it("should return a Bad Request withoud parameter DID", async () => {
        expect.assertions(2);
        const expectedResult = {
          title: "Bad Request",
          status: 400,
          detail: "The format of did parameter is not valid",
        };

        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
          )
          .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toStrictEqual(400);
        expect(res.body).toMatchObject(expectedResult);
      });

      it("should return an empty formatted result: only DID passed", async () => {
        expect.assertions(3);
        const expectedResult: PaginateResult = {
          items: [],
          total: 0,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${userDid}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${userDid}&page[after]=0&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${userDid}&page[after]=0&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${userDid}&page[after]=0&page[size]=10`,
          },
        };
        const spyGet = jest
          .spyOn(IDHub.prototype, "getAttributes")
          .mockResolvedValue(expectedResult.items);
        // we add the same attribute again
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${userDid}`
          )
          .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toStrictEqual(200);
        expect(res.body).toMatchObject(expectedResult);
        expect(spyGet).toHaveBeenCalledWith(userDid);
        spyGet.mockRestore();
      });

      it("should return an empty formatted result: passed DID and Type", async () => {
        expect.assertions(3);
        const type = ["EssifVerifiableID", "EuropassCredential"];
        const encodedType = encodeURIComponent(JSON.stringify(type));
        const expectedResult: PaginateResult = {
          items: [],
          total: 0,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${userDid}&type=${encodedType}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${userDid}&type=${encodedType}&page[after]=0&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${userDid}&type=${encodedType}&page[after]=0&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${userDid}&type=${encodedType}&page[after]=0&page[size]=10`,
          },
        };
        const spyGet = jest
          .spyOn(IDHub.prototype, "getAttributes")
          .mockResolvedValue(expectedResult.items);
        // we add the same attribute again
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${userDid}&type=${encodedType}`
          )
          .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toStrictEqual(200);
        expect(res.body).toMatchObject(expectedResult);
        expect(spyGet).toHaveBeenCalledWith(userDid);
        spyGet.mockRestore();
      });
    });
  });

  describe("identity hub endpoints (File Storage calls mocked)", () => {
    it("should add a new attribute and return 201", async () => {
      expect.assertions(3);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = userDid;

      const spy = jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValue({ hash: attributeHash, function: "keccak256" });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      expect(res.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: attributeInput.id,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      spy.mockRestore();
    });

    it("should return 200 with an existing attribute", async () => {
      expect.assertions(5);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = userDid;
      const spy = jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValueOnce({ hash: attributeHash, function: "keccak256" })
        .mockRejectedValueOnce(
          new BadRequestError(
            `This file is already stored with name ${attributeInput.id}`
          )
        );
      const spyGet = jest
        .spyOn(CASDataStorage.prototype, "get")
        .mockResolvedValue(attributeInput.data.base64);
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);

      // we add the same attribute again
      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${userToken}`)
        .send(attributeInput as IAttributeInput);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: attributeInput.id,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      expect(spyGet).toHaveBeenCalledWith(attributeHash);
      spy.mockRestore();
      spyGet.mockRestore();
    });
  });
});
