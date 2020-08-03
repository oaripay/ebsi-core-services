const supertest = require("supertest");
const jose = require("jose");
const { Agent, TrustedAppRegistry } = require("@cef-ebsi/app-jwt");
const config = require("../../src/config");
const Server = require("../../src/server");

jest.mock("cassandra-driver");

const server = new Server().getServer();
const request = supertest(server);

const randomKey = () => jose.JWK.generateSync("EC", "secp256k1");

const token = jose.JWT.sign({ aud: "ebsi-storage" }, config.privKey);

describe("authentication in storage api", () => {
  it("create a new session with storage api", async () => {
    expect.assertions(2);
    const agent = new Agent();
    const requestToken = await agent.createRequestPayload("ebsi-storage");

    const mock1 = jest
      .spyOn(TrustedAppRegistry.prototype, "verify")
      .mockResolvedValue(true);
    const mock2 = jest
      .spyOn(TrustedAppRegistry.prototype, "checkAuthorization")
      .mockResolvedValue(true);

    const response = await request
      .post("/storage/v1/sessions")
      .send(requestToken);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900,
        issuedAt: expect.any(Number),
      })
    );

    mock1.mockRestore();
    mock2.mockRestore();
  });

  it("reject bad login", async () => {
    expect.assertions(1);

    const response = await request
      .post("/storage/v1/sessions")
      .send({ randomBody: "bad assertion" });

    expect(response.status).toBe(400);
  });

  it("handle token in the headers", async () => {
    expect.assertions(1);

    const response = await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("error no token present in headers", async () => {
    expect.assertions(1);

    const response = await request.get("/storage/v1/stores");

    expect(response.status).toBe(401);
  });

  it("error token with invalid signature", async () => {
    expect.assertions(1);

    const badToken = jose.JWT.sign({ aud: config.API_NAME }, randomKey());
    const response = await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`);

    expect(response.status).toBe(400);
  });

  it("error token with bad audience", async () => {
    expect.assertions(1);

    const badToken = jose.JWT.sign({ aud: "other app" }, config.privKey);
    const response = await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`);

    expect(response.status).toBe(400);
  });
});
