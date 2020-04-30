/* eslint-disable jest/no-hooks */
import request from "supertest";
import http from "http";
import { startEbsiService } from "../../../src/api/app";
import { EBSI_SERVICE } from "../../../src/config";
import { EBSI_API_ERRORS_INT } from "../../../src/errors";
import { initSetupForTesting, mockedAttributes } from "../../utils/auxAPICalls";
import { IAttributeInput } from "../../../src/dtos/attributeInfo";
import IDHub from "../../../src/libs/identityHub/idHub";

jest.setTimeout(100000);

describe("wallet router API calls", () => {
  let server: http.Server;
  const testPort: number = 9900;

  beforeAll(async (done) => {
    // launch Server to test its RESTful API
    server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort,
      EBSI_SERVICE.SWAGGER_FULL_URL.IDHUB
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
    expect(res.status).toStrictEqual(EBSI_API_ERRORS_INT.NOT_FOUND_404);
  });

  describe("identity hub endpoints (mocking IDHub class calls)", () => {
    let userToken: string;
    let userDid: string;
    beforeAll(async (done) => {
      const entitySetup = await initSetupForTesting();
      userToken = entitySetup.userToken;
      userDid = entitySetup.userDid;
      done();
    });
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
    });
  });
});
