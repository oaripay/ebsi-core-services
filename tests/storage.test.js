const ethers = require("ethers");
const jose = require("jose");
require("dotenv").config();

const config = require("../config");
const { BadRequestError, InvalidTokenError } = require("../errors");
const utils = require("../utils");
const auth = require("../auth");

const wallet = ethers.Wallet.createRandom();
const privKey = utils.getJWKfromHex(wallet.privateKey);
const opts = { expiresIn: "15 minutes" };

/*
 * Tests
 */

describe("store  Test", () => {
  it("create a new session with storage API", async () => {
    expect.hasAssertions();
    const payload = {
      iss: "test-app",
      aud: config.API_NAME,
    };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const result = await auth.newSession({
      grantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: selfToken,
    });
    expect(result).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );
  });

  it("reject a bad audience in the payload of the assertion", async () => {
    expect.hasAssertions();
    const payload = {
      iss: "test-app",
      aud: "other-app",
    };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const check = async () => {
      await auth.newSession({
        grantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: selfToken,
      });
    };
    await expect(check()).rejects.toThrow(InvalidTokenError);
  });

  it("reject a bad grantType the payload of the assertion", async () => {
    expect.hasAssertions();
    const payload = {
      iss: "test-app",
      aud: config.API_NAME,
    };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const check = async () => {
      await auth.newSession({
        grantType: "urn:ietf:different-type",
        assertion: selfToken,
      });
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });
});
