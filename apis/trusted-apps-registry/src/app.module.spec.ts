import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { ethers } from "ethers";
import { setupServer } from "msw/node";
import { frameworkErrors } from "@ebsiint-api/shared";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import { createLogger } from "./logger/logger.js";

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;

  const mockServer = setupServer();

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    // Mock WebSocketProvider
    vi.spyOn(ethers.providers, "WebSocketProvider").mockImplementation(
      () =>
        new ethers.providers.BaseProvider(
          "any",
        ) as ethers.providers.WebSocketProvider,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const logger = createLogger({ silent: true });
    const adapter = new FastifyAdapter({
      frameworkErrors: frameworkErrors(logger),
    });
    app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    Logger.overrideLogger(false);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /", () => {
    it("should return 'ok'", async () => {
      expect.assertions(2);

      const response = await request(server).get("/");

      expect(response.text).toBe("ok");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /unknown-route", () => {
    it("should return an error", async () => {
      expect.assertions(2);

      const response = await request(server).get("/unknown-route").send();

      expect(response.body).toStrictEqual({
        detail: "Cannot GET /unknown-route",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should not display the framework in the error message", async () => {
      expect.assertions(2);
      const response = await request(server).get("/%91").send();
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        detail: "/%91 is not a valid url component",
        status: 400,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });
});
