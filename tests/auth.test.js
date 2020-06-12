const supertest = require("supertest");
const jose = require("jose");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../src/config");
const Server = require("../src/server");

jest.mock("cassandra-driver");

const server = new Server().start(config.port);
const request = supertest(server);

const randomKey = () => jose.JWK.generateSync("EC", "secp256k1");

const token = jose.JWT.sign({ aud: "ebsi-storage" }, config.privKey);

/* eslint jest/no-hooks: "off" */
describe("authentication in storage api", () => {
  afterAll(async () => {
    server.close();
  });

  it("create a new session with storage api", async () => {
    expect.assertions(1);
    const agent = new ebsiAppJwt.Agent();
    const requestToken = agent.createRequestPayload("ebsi-storage");

    const mock1 = jest
      .spyOn(ebsiAppJwt.TrustedAppRegistry.prototype, "verify")
      .mockResolvedValue(true);
    const mock2 = jest
      .spyOn(ebsiAppJwt.TrustedAppRegistry.prototype, "checkAuthorization")
      .mockResolvedValue(true);

    await request
      .post("/storage/v1/sessions")
      .send(requestToken)
      // .expect(200)
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

    mock1.mockRestore();
    mock2.mockRestore();
  });

  it("reject bad login", async () => {
    expect.assertions(0);

    await request
      .post("/storage/v1/sessions")
      .send({ randomBody: "bad assertion" })
      .expect(400);
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
    const badToken = jose.JWT.sign({ aud: config.API_NAME }, randomKey());
    await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`)
      .expect(400);
  });

  it("error token with bad audience", async () => {
    expect.assertions(0);
    const badToken = jose.JWT.sign({ aud: "other app" }, config.privKey);
    await request
      .get("/storage/v1/stores")
      .set("Authorization", `Bearer ${badToken}`)
      .expect(400);
  });
});
