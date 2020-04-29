import http from "http";
import net from "net";
import App, { startEbsiService } from "../../src/api/app";
import { API_ERROR_MESSAGES } from "../../src/errors";
import { EBSI_SERVICE } from "../../src/config";

describe("app test suite", () => {
  const testPort: number = 9100;
  it("should throw an exception creating an APP with an unknown service", () => {
    expect.assertions(1);
    expect(() => {
      // eslint-disable-next-line no-new
      new App("");
    }).toThrow(API_ERROR_MESSAGES.NO_EBSI_SERVICE_AVAILABLE);
  });

  test.each`
    service                    | port
    ${EBSI_SERVICE.NAME.IDHUB} | ${testPort}
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

  it("should call startEbsiService", async () => {
    expect.hasAssertions();

    const server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort + 1,
      EBSI_SERVICE.SWAGGER_FULL_URL.IDHUB
    );
    expect(server).toBeInstanceOf(http.Server);
    expect((server.address() as net.AddressInfo).port).toBe(testPort + 1);
    server.close();
  });
});
