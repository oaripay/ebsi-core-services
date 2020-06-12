const supertest = require("supertest");
const jose = require("jose");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../src/config");
const { TEST_APP_NAME, privKey, privKeyJWK } = require("./config");
const Server = require("../src/server");
const { BadRequestError } = require("../src/errors");

jest.mock("cassandra-driver");

const server = new Server().start(config.port, config.testMode);
const request = supertest(server);

const token = jose.JWT.sign({ aud: "ebsi-storage" }, config.privKeyJWK);

/* eslint jest/no-hooks: "off" */
describe("authentication in storage api", () => {
  afterAll(async () => {
    server.close();
  });

  it("create a new session with storage api", async () => {
    expect.assertions(1);
    const agent = new ebsiAppJwt.Agent(
      TEST_APP_NAME,
      privKey,
      config.trustedAppsRegistry
    );
    const requestToken = agent.newRequest("ebsi-storage");

    const spy = jest.spyOn(ebsiAppJwt.Session.prototype, "newSession");
    spy.mockImplementation(() => {
      return {
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: 900,
        issuedAt: Date.now(),
      };
    });

    await request
      .post("/storage/v1/sessions")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(requestToken)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            accessToken: expect.any(String),
            tokenType: "Bearer",
            expiresIn: 900,
            issuedAt: expect.any(Number),
          })
        );
      });

    spy.mockRestore();
  });

  it("reject bad login", async () => {
    expect.assertions(0);
    const agent = new ebsiAppJwt.Agent(
      "unknown-app",
      privKey,
      config.trustedAppsRegistry
    );
    const requestToken = agent.newRequest("ebsi-ledger");

    const spy = jest.spyOn(ebsiAppJwt.Session.prototype, "newSession");
    spy.mockImplementation(() => {
      throw new BadRequestError("Invalid app");
    });

    await request
      .post("/storage/v1/sessions")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(requestToken)
      .expect(400);

    spy.mockRestore();
  });

  it("handle token in the headers", async () => {
    expect.assertions(0);
    await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("error no token present in headers", async () => {
    expect.assertions(0);
    await request.get("/storage/v1/stores").expect(401);
  });

  it("error token with invalid signature", async () => {
    expect.assertions(0);
    const clientPrivKey = privKeyJWK;
    const badToken = jose.JWT.sign({ aud: config.API_NAME }, clientPrivKey);
    await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`)
      .expect(400);
  });

  it("error token with bad audience", async () => {
    expect.assertions(0);
    const apiPrivKey = config.privKeyJWK;
    const badToken = jose.JWT.sign({ aud: "other app" }, apiPrivKey);
    await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`)
      .expect(400);
  });
});
