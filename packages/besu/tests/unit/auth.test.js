const supertest = require("supertest");
const jose = require("jose");
const { Agent, TrustedAppRegistry } = require("@cef-ebsi/app-jwt");

const config = require("../../src/config");
const Server = require("../../src/server");

const server = new Server().getServer();
const request = supertest(server);

let token;
const randomKey = () => jose.JWK.generateSync("EC", "secp256k1");

describe("authentication in ledger api", () => {
  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("create a new session with ledger api", async () => {
    expect.assertions(2);

    const agent = new Agent();
    const requestToken = await agent.createRequestPayload("ebsi-ledger");

    const mock1 = jest
      .spyOn(TrustedAppRegistry.prototype, "verify")
      .mockResolvedValue(true);
    const mock2 = jest
      .spyOn(TrustedAppRegistry.prototype, "checkAuthorization")
      .mockResolvedValue(true);

    const response = await request
      .post("/ledger/v1/sessions")
      .send(requestToken);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900,
        issuedAt: expect.any(Number),
      })
    );
    expect(response.status).toBe(200);
    token = response.body.accessToken;

    mock1.mockRestore();
    mock2.mockRestore();
  });

  it("reject bad login", async () => {
    expect.assertions(2);

    const response = await request
      .post("/ledger/v1/sessions")
      .send({ randomBody: "bad assertion" });

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: expect.stringContaining("grantType must be"),
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("handle token in the headers", async () => {
    expect.assertions(2);
    const response = await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${token}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      });
    expect(response.body).toStrictEqual({
      id: 1,
      jsonrpc: "2.0",
      result: expect.any(String),
    });
    expect(response.status).toBe(200);
  });

  it("continue without token (anonymous access)", async () => {
    expect.assertions(2);
    const response = await request.post("/ledger/v1/blockchains/besu").send({
      jsonrpc: "2.0",
      method: "net_version",
      params: [],
      id: 1,
    });
    expect(response.body).toStrictEqual({
      id: 1,
      jsonrpc: "2.0",
      result: expect.any(String),
    });
    expect(response.status).toBe(200);
  });

  it("error token with invalid signature", async () => {
    expect.assertions(2);
    const badToken = jose.JWT.sign({ aud: config.API_NAME }, randomKey());
    const response = await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${badToken}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      });
    expect(response.body).toStrictEqual({
      title: "Invalid Token",
      status: 400,
      detail: "signature verification failed",
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("error token with bad audience", async () => {
    expect.assertions(2);
    const badToken = jose.JWT.sign({ aud: "other app" }, config.privKey);
    const response = await request
      .post("/ledger/v1/blockchains/besu")
      .set("Authorization", `Bearer ${badToken}`)
      .send({
        jsonrpc: "2.0",
        method: "net_version",
        params: [],
        id: 1,
      });
    expect(response.body).toStrictEqual({
      title: "Invalid Token",
      status: 400,
      detail: expect.stringContaining("incorrect audience"),
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });
});
