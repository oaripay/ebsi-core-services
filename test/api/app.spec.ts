import http from "http";
import net from "net";
import App from "src/api/app";
import { WALLET_API_ERRORS } from "src/error";
import { EBSI_SERVICE } from "src/config";

describe("app test suite", () => {
  it("should throw an exception creating an APP with an unknown service", () => {
    expect.assertions(1);
    expect(() => {
      // eslint-disable-next-line no-new
      new App("");
    }).toThrow(WALLET_API_ERRORS.NO_EBSI_SERVICE_AVAILABLE);
  });

  test.each`
    service                                      | port
    ${EBSI_SERVICE.NAME.WALLET_AUTHMANAGER}      | ${EBSI_SERVICE.PORT.WALLET_AUTHMANAGER}
    ${EBSI_SERVICE.NAME.CREDENTIAL}              | ${EBSI_SERVICE.PORT.CREDENTIAL}
    ${EBSI_SERVICE.NAME.WALLET_DIDDOCUMENT}      | ${EBSI_SERVICE.PORT.WALLET_DIDDOCUMENT}
    ${EBSI_SERVICE.NAME.VERIFIABLE_PRESENTATION} | ${EBSI_SERVICE.PORT.VERIFIABLE_PRESENTATION}
    ${EBSI_SERVICE.NAME.IDHUB}                   | ${EBSI_SERVICE.PORT.IDHUB}
    ${EBSI_SERVICE.NAME.WALLET_NOTIFICATIONS}    | ${EBSI_SERVICE.PORT.WALLET_NOTIFICATIONS}
    ${EBSI_SERVICE.NAME.WALLET_SECURE_ENCLAVE}   | ${EBSI_SERVICE.PORT.WALLET_SECURE_ENCLAVE}
    ${EBSI_SERVICE.NAME.VERIFIABLEID}            | ${EBSI_SERVICE.PORT.VERIFIABLEID}
    ${EBSI_SERVICE.NAME.WALLET}                  | ${EBSI_SERVICE.PORT.WALLET}
    ${EBSI_SERVICE.NAME.UNIVERSITY}              | ${EBSI_SERVICE.PORT.UNIVERSITY}
  `(
    "should start EBSI service $service at $port port",
    async ({ service, port }) => {
      const app = new App(service);
      expect(app).toBeInstanceOf(App);

      const server = await app.Start(port);
      expect(server).toBeInstanceOf(http.Server);
      expect((server.address() as net.AddressInfo).port).toBe(port);

      server.close();
    }
  );
});
