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
// import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import jwtVerify from "jose/jwt/verify";
import querystring from "querystring";
import { AppModule } from "../../src/app.module";
import { AuthenticationRequestResponse } from "../../src/modules/authorisation/authorisation.interface";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { loadConfig } from "../../src/config/configuration";
import { getPublicKey } from "../utils/publicKey";

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  // let appTestName: string;
  // let appTestPrivateKey: string;

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

    /* const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );
    appTestName = configService.get("appTestName");
    appTestPrivateKey = configService.get("appTestPrivateKey"); */
  });

  describe("POST /authentication-requests", () => {
    it("should reject bad requests", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/authentication-requests")
        .send("invalid string");
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/authentication-requests")
        .send({ scope: "invalid scope" });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an authentication request", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      expect(response.body).toStrictEqual({
        uri: expect.stringContaining(
          `openid://?scope=openid%20did_authn&response_type=id_token&client_id=`
        ) as string,
      });
      expect(response.status).toBe(200);

      const query = querystring.decode(
        (response.body as AuthenticationRequestResponse).uri.replace(
          "openid://?",
          ""
        )
      );

      const { publicKeyObject } = await getPublicKey(
        loadConfig().apiPrivateKey
      );
      const verification = await jwtVerify(
        query.request as string,
        publicKeyObject
      );
      expect(verification.payload).toStrictEqual({
        iat: expect.any(Number) as number,
        scope: "openid did_authn",
        response_type: "id_token",
        client_id: expect.any(String) as string,
        nonce: expect.any(String) as string,
        iss: expect.stringContaining("did:ebsi:0x") as string,
      });
    });
  });
});
