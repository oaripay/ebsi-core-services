/* eslint-disable jest/no-hooks */
import request from "supertest";
import express from "express";
import http from "http";
import { startEbsiService } from "../../../src/api/app";
import { EBSI_SERVICE } from "../../../src/config";
import { EBSI_API_ERRORS_INT } from "../../../src/errors";
import * as auth from "../../../src/middleware/auth";
import { GRANT_TYPE } from "../../../src/libs/authManager/secureEnclave/jwt";

jest.setTimeout(100000);
jest.mock("../../../src/middleware/jwt");
jest.mock("../../../src/middleware/auth");

const mockcallNewSession = auth.callNewSession as jest.Mock;

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

  describe("/sessions", () => {
    it("responds 400 to /sessions with no payload", async () => {
      expect.assertions(1);
      mockcallNewSession.mockImplementation(
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) => {
          res.sendStatus(400);
          next();
        }
      );
      const res = await request(server).post(
        `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`
      );
      expect(res.status).toBe(EBSI_API_ERRORS_INT.BAD_REQUEST_400);
    });

    it("responds 200 to /sessions with a correct structured payload mocking auth library", async () => {
      expect.assertions(1);
      const payload = {
        grantType: GRANT_TYPE.jwtBearer,
        assertion:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      };
      mockcallNewSession.mockImplementation(
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) => {
          res.sendStatus(200);
          next();
        }
      );
      const res = await request(server)
        .post(`${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`)
        .send(payload);
      expect(res.status).toBe(200);
    });
  });
});
