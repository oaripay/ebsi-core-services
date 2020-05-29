import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication, NotFoundException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { EthersService } from "./services/ethers.service";
import { AppService } from "./services/app.service";
import configuration from "./config/configuration";

class TestBesuException extends Error {
  private readonly response;

  private readonly status;

  readonly message: any;

  readonly transactionHash = "transactionHash";

  private getErrorString;
}

describe("appController", () => {
  let app: INestApplication;
  let etherService: EthersService;
  let appService: AppService;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env.test", ".env"],
          load: [configuration],
        }),
      ],
      controllers: [AppController],
      providers: [EthersService, AppService],
    }).compile();

    etherService = module.get<EthersService>(EthersService);
    appService = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await app.close();
  });

  describe("test GET's", () => {
    it(`/GET all apps`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getApplicationKeys")
        .mockResolvedValue(["key0", "key1"]);

      jest
        .spyOn(etherService, "getApplicationByKey")
        .mockImplementation(async (key) => {
          return [`appName${key}`, `pubKey${key}`];
        });

      const response = await request(app.getHttpServer()).get(
        "/trusted-apps-registry/v1/apps"
      );

      expect(response.body).toStrictEqual({
        items: [
          { appName: "appNamekey0", pubKey: "pubKeykey0" },
          { appName: "appNamekey1", pubKey: "pubKeykey1" },
        ],
        total: 2,
        pageSize: 10,
        first:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        prev:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        next:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        last:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
      });

      expect(response.status).toBe(200);
    });

    it(`/GET all apps invalid page number`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getApplicationKeys")
        .mockResolvedValue(["key0", "key1"]);

      jest
        .spyOn(etherService, "getApplicationByKey")
        .mockImplementation(async (key) => {
          return [`appName${key}`, `pubKey${key}`];
        });

      const response = await request(app.getHttpServer()).get(
        "/trusted-apps-registry/v1/apps?page[after]=10"
      );

      expect(response.body).toStrictEqual({
        error: "Bad Request",
        message: "invalid page number",
        statusCode: 400,
      });
      expect(response.status).toBe(400);
    });

    it(`/GET all apps no application found`, async () => {
      expect.assertions(2);

      jest.spyOn(etherService, "getApplicationKeys").mockResolvedValue([]);

      jest
        .spyOn(etherService, "getApplicationByKey")
        .mockImplementation(async (key) => {
          return [`appName${key}`, `pubKey${key}`];
        });

      const response = await request(app.getHttpServer()).get(
        "/trusted-apps-registry/v1/apps"
      );

      expect(response.body).toStrictEqual({
        items: [],
        total: 0,
        pageSize: 10,
        first:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        prev:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        next:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        last:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
      });
      expect(response.status).toBe(200);
    });

    it(`/GET app public key`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getApplicationPublicKey")
        .mockResolvedValue("thekey");

      const key = "testappkey";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${key}`
      );

      expect(response.body).toStrictEqual({
        appName: "testappkey",
        pubKey: "thekey",
      });
      expect(response.status).toBe(200);
    });

    it(`/GET app pub key -> throw entity not found`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getApplicationPublicKey")
        .mockImplementation(() => {
          throw new NotFoundException();
        });

      const key = "noappkey";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${key}`
      );

      expect(response.body).toStrictEqual({
        error: "Not Found",
        message: `${key} not found`,
        statusCode: 404,
      });
      expect(response.status).toBe(404);
    });

    it(`/GET authorized apps by appname`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getAuthorizedApps")
        .mockResolvedValue([["ebsi-besu"], [true]]);

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        items: [{ authorizedAppName: "ebsi-besu" }],
        total: 1,
        pageSize: 10,
        first:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        prev:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        next:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        last:
          "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
      });
      expect(response.status).toBe(200);
    });

    it(`/GET authorized apps by appname - >test malware service`, async () => {
      expect.assertions(2);

      jest
        .spyOn(etherService, "getAuthorizedApps")
        .mockResolvedValue({ test: "scrambled value" });

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        error: "Not Found",
        message: "Application does not exist",
        statusCode: 404,
      });
      expect(response.status).toBe(404);
    });

    it(`/GET authorized apps by appname - >test service throws if besu doesnt have app`, async () => {
      expect.assertions(2);

      jest.spyOn(etherService, "getAuthorizedApps").mockImplementation(() => {
        throw new NotFoundException();
      });

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        error: "Not Found",
        message: "Application does not exist",
        statusCode: 404,
      });
      expect(response.status).toBe(404);
    });
  });

  describe("get Challenge by AppName", () => {
    it(`/GET app public key`, async () => {
      expect.assertions(4);

      const spy = jest
        .spyOn(appService, "generateLoginChallenge")
        .mockImplementationOnce(() => "the key");

      const appName = "the_name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/challenge/${appName}`
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(appName);
      expect(response.text).toBe("the key");
      expect(response.status).toBe(200);
    });

    it(`/GET app public key - service throws exception`, async () => {
      expect.assertions(2);

      jest
        .spyOn(appService, "generateLoginChallenge")
        .mockImplementation(() => {
          throw new NotFoundException();
        });

      const appName = "the_name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/challenge/${appName}`
      );

      expect(response.body).toStrictEqual({
        error: "Bad Request",
        message: "there was a problem to process your request",
        statusCode: 400,
      });
      expect(response.status).toBe(400);
    });
  });

  describe("test Post's", () => {
    it(`/POST new App`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(etherService, "addApplication")
        .mockResolvedValue("app-added-to-besu");

      const body = {
        name: "ebsi-wallet-jest-test",
        pubKey: "test",
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/register-app")
        .send(body);

      expect(response.text).toStrictEqual("app-added-to-besu");
      expect(response.status).toBe(201);
    });

    it(`/POST new App throws login`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(etherService, "addApplication")
        .mockResolvedValue("app-added-to-besu");

      const body = {
        name: "ebsi-wallet-jest-test1",
        pubKey: "test",
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/register-app")
        .send(body);

      expect(response.body).toStrictEqual({
        error: "Unauthorized",
        message: "you are not authorized to insert for this DID",
        statusCode: 401,
      });
      expect(response.status).toBe(401);
    });

    it(`/POST new App throws on besu`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest.spyOn(etherService, "addApplication").mockImplementation(() => {
        throw new NotFoundException("a message from besu");
      });

      const body = {
        name: "ebsi-wallet-jest-test",
        pubKey: "test",
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/register-app")
        .send(body);

      expect(response.body).toStrictEqual({
        error: "Bad Request",
        message: "a message from besu",
        statusCode: 400,
      });
      expect(response.status).toBe(400);
    });

    it(`/POST new authorization for an existing app`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(etherService, "addNewAuthorization")
        .mockResolvedValue("authorization added");

      const body = {
        appName: "ebsi-wallet-jest-test",
        authName: "ebsi-wallet-jest-test2",
        status: true,
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/authorize")
        .send(body);

      expect(response.text).toStrictEqual("authorization added");
      expect(response.status).toBe(201);
    });

    it(`/POST new authorization for an existing app -> throw on login`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(etherService, "addNewAuthorization")
        .mockResolvedValue("authorization added");

      const body = {
        appName: "ebsi-wallet-jest-throw-login",
        authName: "ebsi-wallet-jest-test2",
        status: true,
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/authorize")
        .send(body);

      expect(response.body).toStrictEqual({
        error: "Unauthorized",
        message: "you are not authorized to insert for this DID",
        statusCode: 401,
      });
      expect(response.status).toBe(401);
    });

    it(`/POST new authorization for an existing app -> throw on besu insert`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest.spyOn(etherService, "addNewAuthorization").mockImplementation(() => {
        throw new NotFoundException("test");
      });

      jest
        .spyOn(etherService, "revertMessage")
        .mockResolvedValue("a message from besu");

      const body = {
        appName: "ebsi-wallet-jest-test",
        authName: "ebsi-wallet-jest-test2",
        status: true,
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/authorize")
        .send(body);

      expect(response.body).toStrictEqual({
        error: "Bad Request",
        message: "test",
        statusCode: 400,
      });
      expect(response.status).toBe(400);
    });

    it(`/POST new authorization for an existing app -> test besu tx throw error message`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest.spyOn(etherService, "addNewAuthorization").mockImplementation(() => {
        throw new TestBesuException("test");
      });

      jest
        .spyOn(etherService, "revertMessage")
        .mockResolvedValue("besu reverted");

      const body = {
        appName: "ebsi-wallet-jest-test",
        authName: "ebsi-wallet-jest-test2",
        status: true,
        authorize: {
          cryptedMessage: "a message",
          signature: "a signature",
        },
      };

      const response = await request(app.getHttpServer())
        .post("/trusted-apps-registry/v1/authorize")
        .send(body);

      expect(response.body).toStrictEqual({
        error: "Bad Request",
        message: "besu reverted",
        statusCode: 400,
      });
      expect(response.status).toBe(400);
    });
  });
});
