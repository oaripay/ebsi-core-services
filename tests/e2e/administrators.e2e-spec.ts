import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  IdLink,
  DidLink,
  AttributeObject,
  AdministratorResponseObject,
} from "../../src/modules/administrators/administrators.interface";
import { PaginatedList } from "../../src/shared/interfaces";

interface SupertestAdministratorsResponse {
  status: number;
  body: PaginatedList<DidLink>;
}

interface SupertestAdministratorResponse {
  status: number;
  body: AdministratorResponseObject;
}

describe("Administrators (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  describe("/administrators", () => {
    it("should return a collection of administrators", async () => {
      expect.assertions(2);
      const response: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/administrators?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/administrators?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/administrators?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/administrators?page[after]="
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/administrators/{did}", () => {
    it("should return a specific administrator", async () => {
      expect.assertions(3);
      const administratorsResponse: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(administratorsResponse.status).toBe(200);
      const { did }: DidLink = administratorsResponse.body.items[
        administratorsResponse.body.items.length - 1
      ];

      const response: SupertestAdministratorResponse = await request(
        server
      ).get(`/administrators/${did}`);
      expect(response.body).toStrictEqual({
        did: did.toLowerCase(),
        attributes: expect.arrayContaining([]) as AttributeObject[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);
      const response = await request(server).get(
        "/administrators/unknown-administrator"
      );
      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: "Administrator unknown-administrator not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
