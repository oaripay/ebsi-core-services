import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FabricModule } from "./fabric.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { channels } from "./connectionProfile";

describe("Fabric Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FabricModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /channels", () => {
    it("should return a list of channels", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/blockchains/fabric/channels"
      );

      const channelsNames = Object.keys(channels);

      expect(response.body).toStrictEqual({
        items: channelsNames.slice(0, 10),
        self: expect.stringContaining(
          "/blockchains/fabric/channels?page[after]=1&page[size]=10"
        ) as string,
        total: channelsNames.length,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/blockchains/fabric/channels?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/blockchains/fabric/channels?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels?page[after]=${Math.min(
              2,
              Math.ceil(channelsNames.length / 10)
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/blockchains/fabric/channels?page[after]=${Math.max(
              1,
              Math.ceil(channelsNames.length / 10)
            )}&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /channels/{channel}", () => {
    it("should return 204 if the channel exists", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(channels);

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}`
      );

      expect(response.text).toStrictEqual("");
      expect(response.status).toBe(204);
    });

    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
