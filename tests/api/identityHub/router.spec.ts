import request from "supertest";
import http from "http";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import { startEbsiService } from "../../../src/api/app";
import { EBSI_SERVICE } from "../../../src/config";
import { EBSI_API_ERRORS_INT, BadRequestError } from "../../../src/errors";
import * as auth from "../../../src/middleware/auth";
import * as authJwt from "../../../src/middleware/jwt";
import Controller from "../../../src/api/identityHub/controller";

jest.setTimeout(100000);
jest.mock("../../../src/middleware/jwt");
jest.mock("../../../src/middleware/auth");

describe("identity Hub router API calls", () => {
  let server: http.Server;
  const testPort: number = 9900;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async (done) => {
    // launch Server to test its RESTful API
    server = await startEbsiService(
      EBSI_SERVICE.NAME.IDHUB,
      testPort,
      EBSI_SERVICE.SWAGGER_INTERNAL_URL.IDHUB
    );

    done();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  it("responds 404 to /", async () => {
    expect.assertions(1);
    const res = await request(server).get("/");
    expect(res.status).toStrictEqual(EBSI_API_ERRORS_INT.NOT_FOUND_404);
  });

  it("responds 200 to /openapi.json", async () => {
    expect.assertions(1);
    const res = await request(server).get(
      `${EBSI_SERVICE.BASE_PATH.IDHUB}/openapi.json`
    );
    expect(res.status).toStrictEqual(200);
  });

  describe("/sessions", () => {
    it("responds 400 to /sessions with no payload", async () => {
      expect.assertions(1);
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockRejectedValue(new BadRequestError("grantType must be..."));
      const res = await request(server).post(
        `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`
      );
      expect(res.status).toBe(EBSI_API_ERRORS_INT.BAD_REQUEST_400);
    });

    it("responds 200 to /sessions with a correct structured payload mocking auth library", async () => {
      expect.assertions(1);
      const payload = {
        grantType: "client_credentials",
        clientAssertionType:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        clientAssertion: "a token",
        scope: "openid did_authn",
      };
      const returnedToken = {
        accessToken: "a valid token",
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: Date.now(),
        scope: "openid did_authn",
      };
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockResolvedValue(returnedToken);
      const res = await request(server)
        .post(`${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.EBSI_LOGIN}`)
        .send(payload);
      expect(res.status).toBe(200);
    });
  });

  describe("put attributes", () => {
    it("should throw an Unauthorized error with authenticated set to false", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: false });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });

      const response = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(401);
      jest.resetAllMocks();
    });

    it("should throw a BadRequest error with no DID", async () => {
      expect.assertions(1);
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          next();
        });

      const response = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should throw an Unauthorized error with bad hash", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });

      const response = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/bad-hash`
        )
        .send({});
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should return a new attribute", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });
      jest.spyOn(Controller, "setAttribute").mockResolvedValue({
        attribute: {} as any,
        newAttribute: true,
      });

      const response = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(201);
      jest.resetAllMocks();
    });

    it("should return an existing attribute", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });
      jest.spyOn(Controller, "setAttribute").mockResolvedValue({
        attribute: {} as any,
        newAttribute: false,
      });

      const response = await request(server)
        .put(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(200);
      jest.resetAllMocks();
    });
  });

  describe("get attributes", () => {
    it("should throw an Unauthorized error with authenticated set to false", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: false });
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
        )
        .query(`did=${did}`);
      expect(response.status).toStrictEqual(401);
      jest.resetAllMocks();
    });

    it("should throw a BadRequest error with no DID", async () => {
      expect.assertions(1);
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });

      const response = await request(server).get(
        `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
      );
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should throw a BadRequest error with bad DID type", async () => {
      expect.assertions(1);
      const param = {
        did: [],
      };
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
        )
        .query(param);
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should throw a BadRequest error with bad type parameter", async () => {
      expect.assertions(1);
      const param = {
        type: { data: "test" },
        did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      };
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
        )
        .query(param);
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should return a formatted list of two attributes", async () => {
      expect.assertions(2);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest.spyOn(Controller, "getAttributes").mockResolvedValue([
        {
          attribute: "one",
        },
        { attribute: "two" },
      ] as any);
      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
        )
        .query(`did=${did}`);
      expect(response.status).toStrictEqual(200);
      expect(response.body.items).toHaveLength(2);
      jest.resetAllMocks();
    });

    it("should return a formatted list of two attributes filtered", async () => {
      expect.assertions(2);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest.spyOn(Controller, "getAttributesFiltered").mockResolvedValue([
        {
          attribute: "one",
        },
        { attribute: "two" },
      ] as any);
      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`
        )
        .query(`did=${did}&type="one type"`);
      expect(response.status).toStrictEqual(200);
      expect(response.body.items).toHaveLength(2);
      jest.resetAllMocks();
    });
  });

  describe("get attribute", () => {
    it("should throw an Unauthorized error with authenticated set to false", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: false });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(401);
      jest.resetAllMocks();
    });

    it("should throw a BadRequest error with no DID", async () => {
      expect.assertions(1);
      const hash = "0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should throw an Unauthorized error with bad hash", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });

      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/bad-hash`
        )
        .send({});
      expect(response.status).toStrictEqual(400);
      jest.resetAllMocks();
    });

    it("should return the requested attribute", async () => {
      expect.assertions(1);
      const did = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";
      const hash =
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
      jest
        .spyOn(auth, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { authenticated: true });
          next();
        });
      jest
        .spyOn(authJwt, "default")
        .mockImplementation(async (req: any, res: any, next: any) => {
          Object.assign(req.params, { didJwt: did });
          next();
        });
      jest.spyOn(Controller, "getAttribute").mockResolvedValue({} as any);
      const response = await request(server)
        .get(
          `${EBSI_SERVICE.BASE_PATH.IDHUB}${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/${hash}`
        )
        .send({});
      expect(response.status).toStrictEqual(200);
      jest.resetAllMocks();
    });
  });
});
