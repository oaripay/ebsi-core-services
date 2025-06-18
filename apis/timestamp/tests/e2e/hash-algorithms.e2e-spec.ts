import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { ConfigService } from "@nestjs/config";
import { randomInt } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";
import type { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface.ts";

import { AppModule } from "../../src/app.module.ts";
import { getNestFastifyApplication } from "../utils/app.ts";
import { getServer } from "../utils/getServer.ts";

describe("Timestamp API v3 - HashAlgorithms (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    app = await getNestFastifyApplication({
      imports: [AppModule],
    });

    if (process.env.TEST_ENV !== "remote") {
      await app.init();
      const fastifyInstance = app.getHttpAdapter().getInstance();
      await fastifyInstance.ready();
    }

    const configService =
      app.get<ConfigService<ApiConfig, true>>(ConfigService);

    server = getServer(app, configService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash algorithms", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms");
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining("/hash-algorithms?page[after]="),
          next: expect.stringContaining("/hash-algorithms?page[after]="),
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10",
        ),
        total: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /hash-algorithms/{hashAlgorithmId}", () => {
    it("should return a specific hash algorithm", async () => {
      expect.assertions(2);

      const respHashAlgorithms = await request(server).get("/hash-algorithms");
      const { hashAlgorithmId } = (
        respHashAlgorithms.body as {
          items: HashAlgorithmLink[];
        }
      ).items[0]!;

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`,
      );

      expect(response.body).toStrictEqual({
        ianaName: expect.any(String),
        multihash: expect.any(String),
        oid: expect.any(String),
        outputLengthBits: expect.any(Number),
        status: expect.any(String),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the hash algorithm is not found", async () => {
      expect.assertions(2);

      const hashAlgorithmId = randomInt(10_000) + 10_000; // some random number between 10,000 and 20,000

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
        status: 404,
        title: "Hash algorithm Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
