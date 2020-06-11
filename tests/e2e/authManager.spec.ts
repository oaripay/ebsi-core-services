/* eslint-disable jest/no-hooks */
import http from "http";
import { startEbsiService } from "../../src/api/app";
import { EBSI_SERVICE, API_PRIVATE_KEY, EBSI_APPS } from "../../src/config";
import { ComponentSecureEnclave } from "../../src/libs/authManager/secureEnclave";
import AuthManager from "../../src/libs/authManager/authManager";

describe("authManager tests", () => {
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
  it("should create an AuthN token", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    await se.init(API_PRIVATE_KEY);

    const token = await AuthManager.Instance.getAuthZToken(EBSI_APPS.STORAGE);
    expect(token).toBeDefined();
  });
});
