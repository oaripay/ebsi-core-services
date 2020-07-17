import request from "supertest";
import http from "http";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import { startEbsiService } from "../../src/api/app";
import { EBSI_SERVICE } from "../../src/config";
import { EbsiApiErrorsInt, BadRequestError } from "../../src/errors";
import {
  GrantType,
  EbsiAccessTokenScope,
} from "../../src/libs/authManager/secureEnclave/jwt";

jest.setTimeout(100000);

describe("identity Hub router API calls", () => {
  let server: http.Server;
  const testPort = 9900;

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
      expect(res.status).toBe(EbsiApiErrorsInt.BAD_REQUEST_400);
      jest.resetAllMocks();
    });

    it("responds 200 to /sessions with a correct structured payload mocking auth library", async () => {
      expect.assertions(2);
      const payload = {
        grantType: GrantType.jwtBearer,
        assertion: "a valid assertion token",
        scope: EbsiAccessTokenScope.ENTITY,
      };
      const returnedToken = {
        accessToken: "a valid token",
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: Date.now(),
      };
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockImplementation(async () => {
          return returnedToken;
        });
      const res = await request(server)
        .post(`${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: "Bearer",
          expiresIn: 900,
          issuedAt: expect.any(Number),
        })
      );
      jest.resetAllMocks();
    });
  });
});
