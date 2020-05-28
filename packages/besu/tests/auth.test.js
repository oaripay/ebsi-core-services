const supertest = require("supertest");
const jose = require("jose");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../src/config");
const { TEST_APP_NAME, privKey, privKeyJWK } = require("./config");
const Server = require("../src/server");

const server = new Server().start(config.port, config.testMode);
const request = supertest(server);

let token;

/* eslint jest/no-hooks: "off" */
describe("authentication in ledger api", () => {
  afterAll(async () => {
    server.close();
  });

  it("create a new session with ledger api", async () => {
    expect.assertions(1);
    const agent = new ebsiAppJwt.Agent(
      TEST_APP_NAME,
      privKey,
      config.trustedAppsRegistry
    );
    const requestToken = agent.newRequest("ebsi-ledger");

    await request
      .post("/ledger/v1/sessions")
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
        token = response.body.accessToken;
      });
  });

  it("reject bad login", async () => {
    expect.assertions(0);
    const agent = new ebsiAppJwt.Agent(
      "unknown-app",
      privKey,
      config.trustedAppsRegistry
    );
    const requestToken = agent.newRequest("ebsi-storage");

    await request
      .post("/ledger/v1/sessions")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(requestToken)
      .expect(400);
  });

  it("handle token in the headers", async () => {
    expect.assertions(0);
    await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${token}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      })
      .expect(200);
  });

  it("continue without token (anonymous access)", async () => {
    expect.assertions(0);
    await request
      .post("/ledger/v1/blockchains/besu")
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      })
      .expect(200);
  });

  it("error token with invalid signature", async () => {
    expect.assertions(0);
    const clientPrivKey = privKeyJWK;
    const badToken = jose.JWT.sign({ aud: config.API_NAME }, clientPrivKey);
    await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${badToken}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      })
      .expect(400);
  });

  it("error token with bad audience", async () => {
    expect.assertions(0);
    const apiPrivKey = config.privKeyJWK;
    const badToken = jose.JWT.sign({ aud: "other app" }, apiPrivKey);
    await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${badToken}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      })
      .expect(400);
  });
});
