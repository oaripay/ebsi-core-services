import request from "supertest";
import crypto from "crypto";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { DidAuthResponseMode, Agent, AkeResponse } from "@cef-ebsi/siop-auth";
import { loadConfig } from "../../src/config/configuration";

const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

const { authorisationApiUrl, didRegistryApiUrl } = loadConfig();

const createUser = () => ({
  privateKey: crypto.randomBytes(32).toString("hex"),
  did: EbsiWallet.createDid(),
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

  const agent = new Agent({
    privateKey: prefixWith0x(user.privateKey),
    didRegistry: `${didRegistryApiUrl}/identifiers`,
  });

  const uriDecoded = new URLSearchParams(
    (response.body as { uri: string }).uri.replace("openid://?", "")
  );

  await agent.verifyAuthenticationRequest(uriDecoded.get("request"));

  const nonce = crypto.randomBytes(10).toString("base64");
  const didAuthJwt = await agent.createAuthenticationResponse({
    did: user.did,
    nonce,
    redirectUri: uriDecoded.get("client_id"),
    responseMode: DidAuthResponseMode.FORM_POST,
  });

  response = await request(authorisationApiUrl)
    .post("/siop-sessions")
    .send(didAuthJwt.bodyEncoded);

  const accessToken = await agent.verifyAuthenticationResponse(
    response.body as AkeResponse,
    nonce
  );

  return accessToken;
}

export default siopAuthentication;
