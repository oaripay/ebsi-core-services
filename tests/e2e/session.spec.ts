import querystring from "querystring";
import { getSession, getSessionRequestBody } from "../../src/utils";
import * as config from "../../src/config";

describe("session tests", () => {
  it("should create an authN token, send a request and a authZ token", async () => {
    expect.assertions(1);
    const payloadRequest = await getSessionRequestBody(config.API_NAME);
    const session = await getSession();
    const requestJSON = querystring.parse(payloadRequest);
    const authZToken = await session.newSession(requestJSON);
    expect(authZToken).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900,
        issuedAt: expect.any(Number),
        scope: "openid did_authn",
      })
    );
  });
});
