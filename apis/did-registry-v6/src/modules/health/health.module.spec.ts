import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { DEPENDENCIES } from "../../config/configuration.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { HealthModule } from "./health.module.js";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  const dependencies = Object.keys(
    DEPENDENCIES,
  ) as (keyof typeof DEPENDENCIES)[];
  let subgraphTimestamp: number | undefined;
  const mockServer = setupServer(
    graphql.query("GetBlockTimestamp", () => {
      const timestamp = subgraphTimestamp ?? Math.floor(Date.now() / 1000);
      return HttpResponse.json({ data: { _meta: { block: { timestamp } } } });
    }),
  );

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    Logger.overrideLogger(false);
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();
    server = app.getHttpServer();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /health", () => {
    it("should return 'error' if the Subgraph is not synced", async () => {
      expect.assertions(2 + dependencies.length);

      // Old timestamp in the subgraph
      subgraphTimestamp = Math.floor(Date.now() / 1000 - 3600);

      const response = await request(server).get("/health").send();

      // Expect all the dependencies to be up except Besu
      const expectedStatuses: Record<string, unknown> = {};
      expectedStatuses["DIDR Subgraph"] = {
        message: "Not synchronized",
        status: "down",
      };

      const { "DIDR Subgraph": errorStatus, ...otherStatuses } =
        expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          "DIDR Subgraph": errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });
  });
});
