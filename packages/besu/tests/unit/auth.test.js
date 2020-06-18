const supertest = require("supertest");
const jose = require("jose");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../../src/config");
const Server = require("../../src/server");

const server = new Server().getServer();
const request = supertest(server);

let token;
const randomKey = () => jose.JWK.generateSync("EC", "secp256k1");

/* eslint jest/no-hooks: "off" */
describe("authentication in ledger api", () => {
  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("create a new session with ledger api", async () => {
    expect.assertions(1);

    const agent = new ebsiAppJwt.Agent();
    const requestToken = agent.createRequestPayload("ebsi-ledger");

    const mock1 = jest
      .spyOn(ebsiAppJwt.TrustedAppRegistry.prototype, "verify")
      .mockResolvedValue(true);
    const mock2 = jest
      .spyOn(ebsiAppJwt.TrustedAppRegistry.prototype, "checkAuthorization")
      .mockResolvedValue(true);

    await request
      .post("/ledger/v1/sessions")
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

    mock1.mockRestore();
    mock2.mockRestore();
  });

  it("reject bad login", async () => {
    expect.assertions(0);

    await request
      .post("/ledger/v1/sessions")
      .send({ randomBody: "bad assertion" })
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
    const badToken = jose.JWT.sign({ aud: config.API_NAME }, randomKey());
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
    const badToken = jose.JWT.sign({ aud: "other app" }, config.privKey);
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
