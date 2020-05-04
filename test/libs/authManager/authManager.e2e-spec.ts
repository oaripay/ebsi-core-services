/* eslint-disable jest/no-hooks */
import http from "http";
import AuthManager from "../../../src/libs/authManager/authManager";
import ComponentSecureEnclave from "../../../src/libs/authManager/secureEnclave/componentSecureEnclave";
import {
  COMPONENT_KEYSTORE,
  EBSI_APPS,
  EBSI_SERVICE,
} from "../../../src/config";
import { startEbsiService } from "../../../src/api/app";

describe("authManager tests", () => {
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
  it("should create an AuthN token", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    await se.init(COMPONENT_KEYSTORE);

    const token = await AuthManager.Instance.getAuthZToken(EBSI_APPS.STORAGE);
    expect(token).toBeDefined();
  });
});
