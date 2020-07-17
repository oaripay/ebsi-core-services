/* eslint-disable jest/no-hooks */
import request from "supertest";
import http from "http";
import * as auth from "../../src/middleware/auth";
import { startEbsiService } from "../../src/api/app";
import { EBSI_SERVICE, EBSI_DEFAULT_DATA_STORE } from "../../src/config";
import { EbsiApiErrorsInt, BadRequestError } from "../../src/errors";
import { initSetupForTesting, mockedAttributes } from "../utils/auxAPICalls";
import { IAttributeInput } from "../../src/dtos/attributeInfo";
import IDHub from "../../src/libs/identityHub/idHub";
import { PaginateResult } from "../../src/utils";
import { CASDataStorage } from "../../src/libs/dataStorages";
import { ICASFile } from "../../src/daos/casFile";

jest.setTimeout(1000000);

describe("identity hub router API calls", () => {
  let server: http.Server;
  const testPort: number = 9900;

  beforeAll(async (done) => {
    // launch Server to test its RESTful API
    server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort,
      EBSI_SERVICE.SWAGGER_INTERNAL_URL.IDHUB
    );

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
    expect(res.status).toStrictEqual(EbsiApiErrorsInt.NOT_FOUND_404);
  });

  describe("identity hub endpoints (mocking IDHub class calls)", () => {
    it("should add a new attribute and return 201", async () => {
      expect.assertions(3);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      expect(res.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith(
        did,
        expectedResult.hash,
        attributeInput
      );
      jest.restoreAllMocks();
    });

    it("should return 200 with an existing attribute", async () => {
      expect.assertions(4);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      let spy = jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
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
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith(
        did,
        expectedResult.hash,
        attributeInput
      );
      jest.restoreAllMocks();
    });

    it("should returnn 500 with no token", async () => {
      expect.assertions(2);
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;

      const expectedResult = {
        title: "Internal Server Error",
        status: 500,
        detail: "No Bearer Token.",
      };
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(500);
      expect(res.body).toMatchObject(expectedResult);
    });

    it("should returnn 400 with a non valid hash PUT call", async () => {
      expect.assertions(2);
      const { token } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = "0x004";
      delete attributeInput.did;
      delete attributeInput.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const expectedResult = {
        title: "Bad Request",
        status: 400,
        detail: `The hash:${attributeHash} parameter is not valid`,
      };
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(400);
      expect(res.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    it("should returnn 400 with a non valid hash GET call", async () => {
      expect.assertions(2);
      const { token } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = "0x004";
      delete attributeInput.did;
      delete attributeInput.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const expectedResult = {
        title: "Bad Request",
        status: 400,
        detail: `The hash:${attributeHash} parameter is not valid`,
      };
      const res = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toStrictEqual(400);
      expect(res.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    it("should retrieve an existing attribute", async () => {
      expect.assertions(4);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      jest
        .spyOn(IDHub.prototype, "setAttribute")
        .mockResolvedValue({ attribute: expectedResult, newAttribute: true });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
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
        .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spyGet).toHaveBeenCalledWith(did, expectedResult.hash);
      jest.restoreAllMocks();
    });

    describe("get attributes endpoint (mocked)", () => {
      it("should return a Bad Request withoud parameter DID", async () => {
        expect.assertions(2);
        const { token } = await initSetupForTesting();
        const expectedResult = {
          title: "Bad Request",
          status: 400,
          detail: "The format of did parameter is not valid",
        };
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toStrictEqual(400);
        expect(res.body).toMatchObject(expectedResult);
        jest.restoreAllMocks();
      });

      it("should return an empty formatted result: only DID passed", async () => {
        expect.assertions(3);
        const { token, did } = await initSetupForTesting();
        const expectedResult: PaginateResult = {
          items: [],
          total: 0,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          },
        };
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        const spyGet = jest
          .spyOn(IDHub.prototype, "getAttributes")
          .mockResolvedValue(expectedResult.items);
        // we add the same attribute again
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toStrictEqual(200);
        expect(res.body).toMatchObject(expectedResult);
        expect(spyGet).toHaveBeenCalledWith(did);
        jest.restoreAllMocks();
      });

      it("should return an empty formatted result: passed DID and Type", async () => {
        expect.assertions(3);
        const { token, did } = await initSetupForTesting();
        const type = ["EssifVerifiableID", "EuropassCredential"];
        const encodedType = encodeURIComponent(JSON.stringify(type));
        const expectedResult: PaginateResult = {
          items: [],
          total: 0,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
          },
        };
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        const spyGet = jest
          .spyOn(IDHub.prototype, "getAttributes")
          .mockResolvedValue(expectedResult.items);
        // we add the same attribute again
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}&type=${encodedType}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toStrictEqual(200);
        expect(res.body).toMatchObject(expectedResult);
        expect(spyGet).toHaveBeenCalledWith(did);
        jest.restoreAllMocks();
      });
    });
  });

  describe("identity hub endpoints (File Storage calls mocked)", () => {
    it("should add a new attribute and return 201", async () => {
      expect.assertions(3);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });

      const spy = jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValue({ hash: attributeHash, function: "keccak256" });
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      expect(res.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: `${attributeInput.id}.attribute`,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      jest.restoreAllMocks();
    });

    it("should return 200 with an existing attribute", async () => {
      expect.assertions(5);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
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
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);

      // we add the same attribute again
      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: `${attributeInput.id}.attribute`,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      expect(spyGet).toHaveBeenCalledWith(attributeHash);
      jest.restoreAllMocks();
      jest.restoreAllMocks();
    });

    it("should retrieve an existing attribute", async () => {
      expect.assertions(5);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const spy = jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValue({ hash: attributeHash, function: "keccak256" });
      const spyGet = jest
        .spyOn(CASDataStorage.prototype, "get")
        .mockResolvedValue(attributeInput.data.base64);
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);

      // we retrieve the element
      const res2 = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: `${attributeInput.id}.attribute`,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      expect(spyGet).toHaveBeenCalledWith(attributeHash);
      jest.restoreAllMocks();
      jest.restoreAllMocks();
    });

    it("should throw a 404 error with a not existing hash but with a DID with attributes", async () => {
      expect.assertions(5);
      const { token } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      const mockedHash =
        "0x7ee0d94aab0e4f36eae85127056de08433591304a83ff8801bb9212b624f1321";
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = {
        title: "Not Found",
        status: 404,
        detail: `Attribute Info not found with this hash: ${mockedHash}`,
      };
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const spy = jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValue({ hash: attributeHash, function: "keccak256" });
      const spyGet = jest
        .spyOn(CASDataStorage.prototype, "get")
        .mockResolvedValue(attributeInput.data.base64);
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);

      // we retrieve the element
      const res2 = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${mockedHash}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toStrictEqual(404);
      expect(res2.body).toMatchObject(expectedResult);
      expect(spy).toHaveBeenCalledWith({
        fileData: attributeInput.data.base64,
        fileName: `${attributeInput.id}.attribute`,
        database: EBSI_DEFAULT_DATA_STORE,
      } as ICASFile);
      expect(spyGet).toHaveBeenCalledWith(attributeHash);
      jest.restoreAllMocks();
    });

    it("should throw a 404 error with a not existing hash and a DID with no attributes", async () => {
      expect.assertions(2);
      const { token } = await initSetupForTesting();
      const mockedHash =
        "0x7ee0d94aab0e4f36eae85127056de08433591304a83ff8801bb9212b624f1321";
      const expectedResult = {
        title: "Not Found",
        status: 404,
        detail: `Attribute Info not found with this hash: ${mockedHash}`,
      };
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      // we retrieve the element
      const res2 = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${mockedHash}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toStrictEqual(404);
      expect(res2.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    describe("get attributes endpoint (mocked only File Storage calls)", () => {
      it("should return an empty formatted result: only DID passed", async () => {
        expect.assertions(2);
        const { token, did } = await initSetupForTesting();
        const expectedResult: PaginateResult = {
          items: [],
          total: 0,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          },
        };
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        const res = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toStrictEqual(200);
        expect(res.body).toMatchObject(expectedResult);
        jest.restoreAllMocks();
      });

      it("should return one element formatted result: only DID passed", async () => {
        expect.assertions(3);
        const { token, did } = await initSetupForTesting();
        const expectedResult: PaginateResult = {
          items: mockedAttributes.slice(0, 1),
          total: 1,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&page[after]=1&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&page[after]=1&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          },
        };
        expectedResult.items[0].did = did;
        const attributeInput1 = { ...mockedAttributes[0] };
        const attributeHash1 = attributeInput1.hash;
        delete attributeInput1.did;
        delete attributeInput1.hash;
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        jest.spyOn(CASDataStorage.prototype, "insert").mockResolvedValueOnce({
          hash: attributeHash1,
          function: "keccak256",
        });
        jest
          .spyOn(CASDataStorage.prototype, "get")
          .mockResolvedValue(attributeInput1.data.base64);

        const res1 = await request(server)
          .put(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
          )
          .set("Authorization", `Bearer ${token}`)
          .send(attributeInput1 as IAttributeInput);
        expect(res1.status).toStrictEqual(201);

        const resGet = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(resGet.status).toStrictEqual(200);
        expect(resGet.body).toMatchObject(expectedResult);
        jest.restoreAllMocks();
      });

      it("should return a two element formatted result: only DID passed", async () => {
        expect.assertions(4);
        const { token, did } = await initSetupForTesting();
        const expectedResult: PaginateResult = {
          items: mockedAttributes.slice(0, 2),
          total: 2,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&page[after]=2&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&page[after]=2&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          },
        };
        expectedResult.items[0].did = did;
        expectedResult.items[1].did = did;
        const attributeInput1 = { ...mockedAttributes[0] };
        const attributeHash1 = attributeInput1.hash;
        delete attributeInput1.did;
        delete attributeInput1.hash;
        const attributeInput2 = { ...mockedAttributes[1] };
        const attributeHash2 = attributeInput2.hash;
        delete attributeInput2.did;
        delete attributeInput2.hash;
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        jest
          .spyOn(CASDataStorage.prototype, "insert")
          .mockResolvedValueOnce({
            hash: attributeHash1,
            function: "keccak256",
          })
          .mockResolvedValueOnce({
            hash: attributeHash2,
            function: "keccak256",
          });
        jest
          .spyOn(CASDataStorage.prototype, "get")
          .mockResolvedValueOnce(attributeInput1.data.base64)
          .mockResolvedValueOnce(attributeInput2.data.base64);

        const res1 = await request(server)
          .put(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
          )
          .set("Authorization", `Bearer ${token}`)
          .send(attributeInput1 as IAttributeInput);
        expect(res1.status).toStrictEqual(201);

        const res2 = await request(server)
          .put(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash2}`
          )
          .set("Authorization", `Bearer ${token}`)
          .send(attributeInput2 as IAttributeInput);
        expect(res2.status).toStrictEqual(201);

        const resGet = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(resGet.status).toStrictEqual(200);
        expect(resGet.body).toMatchObject(expectedResult);
        jest.restoreAllMocks();
      });

      it("should return one element filtered with type 'attributeType2'", async () => {
        expect.assertions(4);
        const { token, did } = await initSetupForTesting();
        const type = ["attributeType2"];
        const encodedType = encodeURIComponent(JSON.stringify(type));
        const expectedResult: PaginateResult = {
          items: mockedAttributes.slice(0, 1),
          total: 1,
          pageSize: 10,
          links: {
            first: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
            last: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=1&page[size]=10`,
            next: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=1&page[size]=10`,
            prev: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
          },
        };
        expectedResult.items[0].did = did;
        const attributeInput1 = { ...mockedAttributes[0] };
        const attributeHash1 = attributeInput1.hash;
        delete attributeInput1.did;
        delete attributeInput1.hash;
        const attributeInput2 = { ...mockedAttributes[1] };
        const attributeHash2 = attributeInput2.hash;
        delete attributeInput2.did;
        delete attributeInput2.hash;
        jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
          Object.assign(req.params, { authenticated: true });
        });
        jest
          .spyOn(CASDataStorage.prototype, "insert")
          .mockResolvedValueOnce({
            hash: attributeHash1,
            function: "keccak256",
          })
          .mockResolvedValueOnce({
            hash: attributeHash2,
            function: "keccak256",
          });
        jest
          .spyOn(CASDataStorage.prototype, "get")
          .mockResolvedValueOnce(attributeInput1.data.base64)
          .mockResolvedValueOnce(attributeInput2.data.base64);

        const res1 = await request(server)
          .put(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
          )
          .set("Authorization", `Bearer ${token}`)
          .send(attributeInput1 as IAttributeInput);
        expect(res1.status).toStrictEqual(201);

        const res2 = await request(server)
          .put(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash2}`
          )
          .set("Authorization", `Bearer ${token}`)
          .send(attributeInput2 as IAttributeInput);
        expect(res2.status).toStrictEqual(201);

        const resGet = await request(server)
          .get(
            `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}&type=${encodedType}`
          )
          .set("Authorization", `Bearer ${token}`);
        expect(resGet.status).toStrictEqual(200);
        expect(resGet.body).toMatchObject(expectedResult);
        jest.restoreAllMocks();
      });
    });

    it("should return two elements filtered with an array of string arrays", async () => {
      expect.assertions(4);
      const { token, did } = await initSetupForTesting();
      const type = [
        ["attributeType1", "attributeType2"],
        ["attributeType1", "attributeType3"],
      ];
      const encodedType = encodeURIComponent(JSON.stringify(type));
      const expectedResult: PaginateResult = {
        items: mockedAttributes.slice(0, 2),
        total: 2,
        pageSize: 10,
        links: {
          first: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
          last: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=2&page[size]=10`,
          next: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=2&page[size]=10`,
          prev: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
        },
      };
      expectedResult.items[0].did = did;
      expectedResult.items[1].did = did;
      const attributeInput1 = { ...mockedAttributes[0] };
      const attributeHash1 = attributeInput1.hash;
      delete attributeInput1.did;
      delete attributeInput1.hash;
      const attributeInput2 = { ...mockedAttributes[1] };
      const attributeHash2 = attributeInput2.hash;
      delete attributeInput2.did;
      delete attributeInput2.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      jest
        .spyOn(CASDataStorage.prototype, "insert")
        .mockResolvedValueOnce({
          hash: attributeHash1,
          function: "keccak256",
        })
        .mockResolvedValueOnce({
          hash: attributeHash2,
          function: "keccak256",
        });
      jest
        .spyOn(CASDataStorage.prototype, "get")
        .mockResolvedValueOnce(attributeInput1.data.base64)
        .mockResolvedValueOnce(attributeInput2.data.base64);

      const res1 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput1 as IAttributeInput);
      expect(res1.status).toStrictEqual(201);

      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash2}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput2 as IAttributeInput);
      expect(res2.status).toStrictEqual(201);

      const resGet = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}&type=${encodedType}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(resGet.status).toStrictEqual(200);
      expect(resGet.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });
  });

  describe("get attributes endpoint (whole flow)", () => {
    it("should retrieve an existing attribute", async () => {
      expect.assertions(3);
      const { token, did } = await initSetupForTesting();
      const attributeInput = { ...mockedAttributes[0] };
      const attributeHash = attributeInput.hash;
      delete attributeInput.did;
      delete attributeInput.hash;
      const expectedResult = { ...mockedAttributes[0] };
      expectedResult.did = did;
      const res = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput as IAttributeInput);
      expect(res.status).toStrictEqual(201);
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      // we retrieve the element
      const res2 = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${attributeHash}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toStrictEqual(200);
      expect(res2.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    it("should return one element formatted result: only DID passed", async () => {
      expect.assertions(3);
      const { token, did } = await initSetupForTesting();
      const expectedResult: PaginateResult = {
        items: mockedAttributes.slice(1, 2),
        total: 1,
        pageSize: 10,
        links: {
          first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          last: `/identity-hub/v1/attributes?did=${did}&page[after]=1&page[size]=10`,
          next: `/identity-hub/v1/attributes?did=${did}&page[after]=1&page[size]=10`,
          prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
        },
      };
      expectedResult.items[0].did = did;
      const attributeInput1 = { ...mockedAttributes[1] };
      const attributeHash1 = attributeInput1.hash;
      delete attributeInput1.did;
      delete attributeInput1.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const res1 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput1 as IAttributeInput);
      expect(res1.status).toStrictEqual(201);

      const resGet = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(resGet.status).toStrictEqual(200);
      expect(resGet.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    it("should return a two element formatted result: only DID passed", async () => {
      expect.assertions(4);
      const { token, did } = await initSetupForTesting();
      const expectedResult: PaginateResult = {
        items: mockedAttributes.slice(2, 4),
        total: 2,
        pageSize: 10,
        links: {
          first: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
          last: `/identity-hub/v1/attributes?did=${did}&page[after]=2&page[size]=10`,
          next: `/identity-hub/v1/attributes?did=${did}&page[after]=2&page[size]=10`,
          prev: `/identity-hub/v1/attributes?did=${did}&page[after]=0&page[size]=10`,
        },
      };
      expectedResult.items[0].did = did;
      expectedResult.items[1].did = did;
      const attributeInput1 = { ...mockedAttributes[2] };
      const attributeHash1 = attributeInput1.hash;
      delete attributeInput1.did;
      delete attributeInput1.hash;
      const attributeInput2 = { ...mockedAttributes[3] };
      const attributeHash2 = attributeInput2.hash;
      delete attributeInput2.did;
      delete attributeInput2.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const res1 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput1 as IAttributeInput);
      expect(res1.status).toStrictEqual(201);

      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash2}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput2 as IAttributeInput);
      expect(res2.status).toStrictEqual(201);

      const resGet = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(resGet.status).toStrictEqual(200);
      expect(resGet.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });

    it("should return one element filtered with type 'attributeType2'", async () => {
      expect.assertions(4);
      const { token, did } = await initSetupForTesting();
      const type = ["attributeType2"];
      const encodedType = encodeURIComponent(JSON.stringify(type));
      const expectedResult: PaginateResult = {
        items: mockedAttributes.slice(6, 7),
        total: 1,
        pageSize: 10,
        links: {
          first: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
          last: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=1&page[size]=10`,
          next: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=1&page[size]=10`,
          prev: `/identity-hub/v1/attributes?did=${did}&type=${encodedType}&page[after]=0&page[size]=10`,
        },
      };
      expectedResult.items[0].did = did;
      const attributeInput1 = { ...mockedAttributes[6] };
      const attributeHash1 = attributeInput1.hash;
      delete attributeInput1.did;
      delete attributeInput1.hash;
      const attributeInput2 = { ...mockedAttributes[7] };
      const attributeHash2 = attributeInput2.hash;
      delete attributeInput2.did;
      delete attributeInput2.hash;
      jest.spyOn(auth, "handleToken").mockImplementation(async (req: any) => {
        Object.assign(req.params, { authenticated: true });
      });
      const res1 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash1}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput1 as IAttributeInput);
      expect(res1.status).toStrictEqual(201);

      const res2 = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${attributeHash2}`
        )
        .set("Authorization", `Bearer ${token}`)
        .send(attributeInput2 as IAttributeInput);
      expect(res2.status).toStrictEqual(201);

      const resGet = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}?did=${did}&type=${encodedType}`
        )
        .set("Authorization", `Bearer ${token}`);
      expect(resGet.status).toStrictEqual(200);
      expect(resGet.body).toMatchObject(expectedResult);
      jest.restoreAllMocks();
    });
  });
});
