import request from "supertest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "../../src/app.controller";
import { EthersService } from "../../src/services/ethers.service";
import { AppService } from "../../src/services/app.service";
import configuration from "../../src/config/configuration";
import HttpExceptionFilter from "../../src/filters/http-exception.filter";

jest.mock("web3", () =>
  jest.fn().mockImplementation(() => ({
    eth: {
      getTransactionReceipt() {},
    },
  }))
);

jest.mock("ethers", () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn(),
    },
    Contract: jest.fn().mockImplementation(() => ({
      connect() {
        return {
          owner() {},
          getApplicationPublicKey() {},
          getApplicationKeys() {},
          getApplicationByKey() {},
          getAuthorizedApps() {},
        };
      },
    })),
    Wallet: jest.fn().mockImplementation(() => ({})),
  },
}));

class TestBesuException extends Error {
  private readonly response;

  private readonly status;

  readonly message: any;

  readonly transactionHash = "transactionHash";

  private getErrorString;
}

describe("app.controller", () => {
  let app: INestApplication;
  let ethersService: EthersService;
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
      providers: [
        EthersService,
        AppService,
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    ethersService = module.get<EthersService>(EthersService);
    appService = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await app.close();
  });

  describe("test GET's", () => {
    it("/GET all apps", async () => {
      expect.assertions(2);

      jest
        .spyOn(ethersService, "getApplicationKeys")
        .mockImplementation(async () => ["key0", "key1"]);

      jest
        .spyOn(ethersService, "getApplicationByKey")
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
        links: {
          first: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          prev: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          next: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          last: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
        },
      });

      expect(response.status).toBe(200);
    });

    it(`/GET all apps invalid page number`, async () => {
      expect.assertions(2);

      jest
        .spyOn(ethersService, "getApplicationKeys")
        .mockResolvedValue(["key0", "key1"]);

      jest
        .spyOn(ethersService, "getApplicationByKey")
        .mockImplementation(async (key) => {
          return [`appName${key}`, `pubKey${key}`];
        });

      const response = await request(app.getHttpServer()).get(
        "/trusted-apps-registry/v1/apps?page[after]=10"
      );

      expect(response.body).toStrictEqual({
        detail: "invalid page number",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it(`/GET all apps no application found`, async () => {
      expect.assertions(2);

      jest.spyOn(ethersService, "getApplicationKeys").mockResolvedValue([]);

      jest
        .spyOn(ethersService, "getApplicationByKey")
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
        links: {
          first: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          prev: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          next: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          last: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
        },
      });
      expect(response.status).toBe(200);
    });

    it(`/GET all apps with unexpected error`, async () => {
      expect.assertions(2);

      jest.spyOn(ethersService, "getApplicationKeys").mockImplementation(() => {
        throw new Error("unexpected");
      });

      const response = await request(app.getHttpServer()).get(
        "/trusted-apps-registry/v1/apps"
      );

      expect(response.body).toStrictEqual({
        detail:
          "The server encountered an internal error and was unable to complete your request",
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it(`/GET app public key`, async () => {
      expect.assertions(2);

      jest
        .spyOn(ethersService, "getApplicationPublicKey")
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
        .spyOn(ethersService, "getApplicationPublicKey")
        .mockImplementation(() => {
          throw new Error();
        });

      const key = "noappkey";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${key}`
      );

      expect(response.body).toStrictEqual({
        detail: "noappkey not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it(`/GET authorized apps by appname`, async () => {
      expect.assertions(2);

      jest
        .spyOn(ethersService, "getAuthorizedApps")
        .mockResolvedValue(["ebsi-besu"]);

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        items: [{ authorizedAppName: "ebsi-besu" }],
        total: 1,
        pageSize: 10,
        links: {
          first: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          prev: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          next: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
          last: "/trusted-apps-registry/v1/apps?page[after]=0&page[size]=10",
        },
      });
      expect(response.status).toBe(200);
    });

    it(`/GET authorized apps by appname -> test malware service`, async () => {
      expect.assertions(2);

      jest.spyOn(ethersService, "getAuthorizedApps").mockResolvedValue([]);

      const appName = "test-malware-service";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        detail: "Application does not exist",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it(`/GET authorized apps by appname -> test service throws if besu doesnt have app`, async () => {
      expect.assertions(2);

      jest.spyOn(ethersService, "getAuthorizedApps").mockImplementation(() => {
        throw new Error();
      });

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`
      );

      expect(response.body).toStrictEqual({
        detail: "Application does not exist",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it(`/GET authorized apps by appname -> test with page after too high`, async () => {
      expect.assertions(2);

      jest
        .spyOn(ethersService, "getAuthorizedApps")
        .mockResolvedValue(["ebsi-besu"]);

      const appName = "ebsi-wallet-test-app-name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/apps/${appName}/authorized-apps?page[after]=2000`
      );

      expect(response.body).toStrictEqual({
        detail: "invalid page number",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("/wrong-route GET should return 404", async () => {
      expect.assertions(3);

      const response = await request(app.getHttpServer()).get("/wrong-route");

      expect(response.body).toStrictEqual({
        detail: "Cannot GET /wrong-route",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(response.header).toStrictEqual(
        expect.objectContaining({
          "content-type": "application/problem+json; charset=utf-8",
        })
      );
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
          throw new Error();
        });

      const appName = "the_name";

      const response = await request(app.getHttpServer()).get(
        `/trusted-apps-registry/v1/challenge/${appName}`
      );

      expect(response.body).toStrictEqual({
        detail: "There was a problem to process your request",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
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
        .spyOn(ethersService, "addApplication")
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
        .spyOn(ethersService, "addApplication")
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
        detail: "You are not authorized to insert for this DID",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it(`/POST new App throws on besu`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest.spyOn(ethersService, "addApplication").mockImplementation(() => {
        throw new Error("a message from besu");
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
        detail: "a message from besu",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
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
        .spyOn(ethersService, "addNewAuthorization")
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
        .spyOn(ethersService, "addNewAuthorization")
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
        detail: "You are not authorized to insert for this DID",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it(`/POST new authorization for an existing app -> throw on besu insert`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(ethersService, "addNewAuthorization")
        .mockImplementation(() => {
          throw new Error("test");
        });

      jest
        .spyOn(ethersService, "revertMessage")
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
        detail: "test",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it(`/POST new authorization for an existing app -> test besu tx throw error message`, async () => {
      expect.assertions(2);

      // insert a new app in the ledger
      jest
        .spyOn(appService, "checkLogin")
        .mockResolvedValue("ebsi-wallet-jest-test");

      jest
        .spyOn(ethersService, "addNewAuthorization")
        .mockImplementation(() => {
          throw new TestBesuException("test");
        });

      jest
        .spyOn(ethersService, "revertMessage")
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
        detail: "besu reverted",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });
});
