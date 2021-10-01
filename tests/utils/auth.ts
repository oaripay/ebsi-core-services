/* eslint-disable import/no-extraneous-dependencies */
import request from "supertest";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { DidAuthResponseMode, Agent } from "@cef-ebsi/siop-auth";
import { AkeResponse, Agent as OAuth2Agent } from "@cef-ebsi/oauth2-auth";
import { loadConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";

const {
  authorisationApiUrl,
  didRegistryApiUrl,
  trustedAppsRegistryApiUrl,
  apiName,
} = loadConfig();

export async function oauth2Authentication(trustedApp: {
  privateKey: string;
  name: string;
}): Promise<string> {
  const listAppsByName = await request(trustedAppsRegistryApiUrl)
    .get(`/apps?name=${trustedApp.name}`)
    .send();
  const appId = (listAppsByName.body as { items: { id: string }[] }).items[0]
    .id;
  const kid = `${trustedAppsRegistryApiUrl}/apps/${appId}`;

  const nonce = uuidv4();
  const agent = new OAuth2Agent(trustedApp.privateKey, {
    issuer: trustedApp.name,
    kid,
  });

  const authRequest = await agent.createRequestPayload(apiName, {
    nonce,
  });

  const response = await request(authorisationApiUrl)
    .post("/oauth2-sessions")
    .send(authRequest);

  return agent.verifyAuthenticationResponse(
    response.body as AkeResponse,
    nonce
  );
}

export async function siopAuthentication(user: {
  privateKey: string;
  did: string;
}): Promise<string> {
  const agent = new Agent({
    privateKey: prefixWith0x(user.privateKey),
    didRegistry: `${didRegistryApiUrl}/identifiers`,
  });

  let response = await request(authorisationApiUrl)
    .post("/authentication-requests")
    .send({
      scope: "openid did_authn",
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
    response.body,
    nonce
  );

  return accessToken;
}

export default siopAuthentication;
