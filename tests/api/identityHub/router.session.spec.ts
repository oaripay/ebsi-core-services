import request from "supertest";
import http from "http";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import { startEbsiService } from "../../../src/api/app";
import { EBSI_SERVICE } from "../../../src/config";
import { EBSI_API_ERRORS_INT, BadRequestError } from "../../../src/errors";
import { AUTHORIZATION_TYPE } from "../../../src/libs/authManager/secureEnclave/jwt";

jest.setTimeout(100000);

describe("identity Hub router API calls", () => {
  let server: http.Server;
  const testPort: number = Math.floor(Math.random() * 9988);

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async (done) => {
    // launch Server to test its RESTful API
    server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort,
      EBSI_SERVICE.SWAGGER_INTERNAL_URL.IDHUB
    );

    done();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe("/sessions", () => {
    it("responds 400 to /sessions with no payload", async () => {
      expect.assertions(1);
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockImplementation(() => {
          throw new BadRequestError("grantType must be...");
        });
      const res = await request(server).post(
        `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`
      );
      expect(res.status).toBe(EBSI_API_ERRORS_INT.BAD_REQUEST_400);
      jest.resetAllMocks();
    });

    it("responds 200 to /sessions with a correct structured payload mocking auth library", async () => {
      expect.assertions(2);
      const payload =
        "grantType=client_credentials&clientAssertionType=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&clientAssertion=eyJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei90cnVzdGVkLWFwcHMtcmVnaXN0cnkvdjEvYXBwcy9lYnNpLWlkaHViIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3MiOiJlYnNpLWlkaHViIiwic3ViIjoiZWJzaS1pZGh1YiIsImF1ZCI6ImVic2ktaWRodWIiLCJqdGkiOiI5MDRmYmVlZC0wODk3LTQ1YWMtOGJiZS0xMTJmZTk3YmMwOTAiLCJpYXQiOjE1OTE3ODY4MTcsImV4cCI6MTU5MTc4NjgzMn0.UM8cw6wG_ozUhLyxsd7PcFWlbv9P923JrX4tnsA3KiSV47I7RTLodQt-XMwtLj_nDxZajqLLAhTLeJ9RNTIYVQ&scope=openid%20did_authn";
      const returnedToken = {
        accessToken: "a valid token",
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: Date.now(),
        scope: "openid did_authn",
      };
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockImplementation(async () => {
          return returnedToken;
        });
      const res = await request(server)
        .post(`${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`)
        .set("Content-Type", "application/x-www-form-urlencoded")
        .set("Authorization", AUTHORIZATION_TYPE.DID_CCG_TAR_V1)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: "Bearer",
          expiresIn: 900,
          issuedAt: expect.any(Number),
          scope: "openid did_authn",
        })
      );
      jest.resetAllMocks();
    });
  });
});
