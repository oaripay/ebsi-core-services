import request from "supertest";
import crypto from "crypto";
// eslint-disable-next-line import/no-extraneous-dependencies
import * as bs58 from "bs58";
import { EbsiDidAuth, DidAuthResponseMode, Agent } from "@cef-ebsi/siop-auth";
import querystring from "querystring";
import { loadConfig } from "../../src/config/configuration";

const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

const { authorisationApiUrl, didRegistryApiUrl } = loadConfig();

const createUser = () => ({
  privateKey: crypto.randomBytes(32).toString("hex"),
  did: `did:ebsi:${bs58.encode(crypto.randomBytes(32))}`,
});

export async function siopAuthentication(
  user: {
    privateKey: string;
    did: string;
  } = createUser()
): Promise<string> {
  let response = await request(authorisationApiUrl)
    .post("/authentication-requests")
    .send({
      scope: "openid did_authn",
    });
  const uriDecoded = querystring.decode(
    (response.body as { uri: string }).uri.replace("openid://?", "")
  ) as { request: string; client_id: string };
  await EbsiDidAuth.verifyAuthenticationRequest(
    uriDecoded.request,
    `${didRegistryApiUrl}/identifiers`
  );

  const nonce = crypto.randomBytes(10).toString("base64");
  const didAuthJwt = await EbsiDidAuth.createAuthenticationResponse({
    hexPrivatekey: prefixWith0x(user.privateKey),
    did: user.did,
    nonce,
    redirectUri: uriDecoded.client_id,
    response_mode: DidAuthResponseMode.FORM_POST,
  });

  response = await request(authorisationApiUrl)
    .post("/siop-sessions")
    .send(didAuthJwt.bodyEncoded);

  const agent = new Agent({
    privateKey: user.privateKey,
    didRegistry: `${didRegistryApiUrl}/identifiers`,
  });
  const accessToken = await agent.verifyAuthenticationResponse(
    response.body,
    nonce
  );

  return accessToken;
}

export default siopAuthentication;
