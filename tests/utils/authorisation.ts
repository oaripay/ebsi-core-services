import crypto from "crypto";
import request from "supertest";
import axios from "axios";
import { base58btc } from "multiformats/bases/base58";
import { Agent as OAuth2Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { DidAuthResponseMode, Agent as SiopAgent } from "@cef-ebsi/siop-auth";
import { createJWT, ES256KSigner } from "did-jwt";
import { loadConfig } from "../../src/config/configuration";

const {
  apiName,
  authorisationApiName,
  authorisationApiUrl,
  authorisationApiDid,
  didRegistryApiUrl,
  trustedAppsRegistryApiUrl,
  testApp,
  testUser,
} = loadConfig();

export const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

export async function createFakeToken(
  loginHint: "did_siop" | "oauth2",
  useKidAuthApi = false
): Promise<string> {
  let kid = `${trustedAppsRegistryApiUrl}/0x${"0".repeat(64)}`;
  if (useKidAuthApi) {
    const response = await axios.get(
      `${trustedAppsRegistryApiUrl}/apps?name=${authorisationApiName}`
    );
    const { href } = (
      response.data as {
        items: { href: string }[];
      }
    ).items[0];
    kid = href;
  }

  if (loginHint === "did_siop") {
    return createJWT(
      {
        sub: testUser.did,
        aud: "ebsi-core-services",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15,
        nonce: crypto.randomBytes(16).toString("base64"),
        login_hint: "did_siop",
      },
      {
        alg: "ES256K",
        issuer: authorisationApiDid,
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      },
      {
        kid,
      }
    );
  }

  const payload = {
    iss: authorisationApiName,
    sub: testApp.name,
    aud: apiName,
    atHash: `0x${crypto.randomBytes(32).toString("hex")}`,
    exp: Math.trunc(Date.now() / 1000) + 15,
    nonce: crypto.randomBytes(16).toString("base64"),
  };

  return createJWT(
    payload,
    {
      alg: "ES256K",
      issuer: authorisationApiName,
      signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
    },
    {
      kid,
    }
  );
}

const createUser = () => ({
  privateKey: crypto.randomBytes(32).toString("hex"),
  did: `did:ebsi:${base58btc.encode(crypto.randomBytes(32)).slice(1)}`,
});

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

  const nonce = crypto.randomUUID();
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
  const uriDecoded = new URLSearchParams(
    (response.body as { uri: string }).uri.replace("openid://?", "")
  );

  const agent = new SiopAgent({
    privateKey: prefixWith0x(user.privateKey),
    didRegistry: `${didRegistryApiUrl}/identifiers`,
  });

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
