import { URLSearchParams } from "node:url";
import crypto, { randomUUID } from "node:crypto";
import request from "supertest";
import axios, { AxiosResponse } from "axios";
import { Agent as OAuth2Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { Agent as SiopAgent, verifyJwtTar } from "@cef-ebsi/siop-auth";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { exportJWK, generateKeyPair, importJWK } from "jose";
import { createJWT, ES256KSigner } from "did-jwt";
import { ConfigService } from "@nestjs/config";
import { encode } from "@ebsiint-api/shared";
import { ApiConfig } from "../../src/config/configuration";

export async function createFakeToken({
  loginHint,
  authorisationApiName,
  testUserDid,
  testAppName,
  useKidAuthApi = false,
  configService,
}: {
  loginHint: "did_siop" | "oauth2";
  authorisationApiName: string;
  testUserDid?: string;
  testAppName?: string;
  useKidAuthApi: boolean;
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> {
  let trustedAppsRegistryApiUrl = configService.get<string>(
    "trustedAppsRegistryApiUrl"
  );

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
  }

  let kid = `${trustedAppsRegistryApiUrl}/0x${"0".repeat(64)}`;

  if (useKidAuthApi) {
    kid = `${trustedAppsRegistryApiUrl}/apps/${authorisationApiName}`;
  }

  if (loginHint === "did_siop") {
    return createJWT(
      {
        sub: testUserDid,
        aud: "ebsi-core-services",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15,
        nonce: crypto.randomBytes(16).toString("base64"),
        login_hint: "did_siop",
      },
      {
        alg: "ES256K",
        issuer: EbsiWallet.createDid(),
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
      {
        kid,
      }
    );
  }

  const payload = {
    iss: authorisationApiName,
    sub: testAppName,
    aud: "ledger-api",
    atHash: `0x${crypto.randomBytes(32).toString("hex")}`,
    exp: Math.trunc(Date.now() / 1000) + 15,
    nonce: crypto.randomBytes(16).toString("base64"),
  };

  return createJWT(
    payload,
    {
      alg: "ES256K",
      issuer: authorisationApiName,
      signer: ES256KSigner(crypto.randomBytes(32)),
    },
    {
      kid,
    }
  );
}

export async function requestOAuth2Jwt({
  trustedAppPrivateKey,
  trustedAppName,
  configService,
}: {
  trustedAppPrivateKey: string;
  trustedAppName: string;
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> {
  let authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  let trustedAppsRegistryApiUrl = configService.get<string>(
    "trustedAppsRegistryApiUrl"
  );

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
    trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
  }

  const nonce = crypto.randomUUID();
  const agent = new OAuth2Agent({
    privateKey: trustedAppPrivateKey,
    name: trustedAppName,
    trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
  });

  const authRequest = await agent.createRequest("ledger-api", {
    nonce,
  });

  const response = await request(authorisationApiUrl)
    .post("/oauth2-sessions")
    .send(authRequest);

  return agent.verifyAkeResponse(response.body as AkeResponse, { nonce });
}

export const requestSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  configService,
}: {
  clientKid: string;
  clientPrivateKey: string;
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> => {
  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  let authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  let trustedAppsRegistryApiUrl = configService.get<string>(
    "trustedAppsRegistryApiUrl"
  );

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
    trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
  }

  const siopAgent = new SiopAgent({
    privateKey: await importJWK(
      encode.privateKey.fromHexToJWK(clientPrivateKey),
      alg
    ),
    kid: clientKid,
    alg,
    siopV2: true,
  });

  // 1. First, the client calls /authentication-requests
  const authenticationRequestsResponse = await axios.post<
    { scope: string },
    AxiosResponse<string>
  >(`${authorisationApiUrl}/authentication-requests`, {
    scope: "openid did_authn",
  });

  // 2. The client verifies the response
  const uri = authenticationRequestsResponse.data;

  const urlParams = new URLSearchParams(uri.replace("openid://?", ""));
  const params = Object.fromEntries(urlParams);
  Object.keys(params).forEach((k) => {
    params[k] = decodeURIComponent(params[k]);
  });

  const { payload } = await verifyJwtTar(params.request, {
    trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
  });

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const authenticationResponse = await siopAgent.createResponse({
    did: clientKid.split("#")[0],
    nonce,
    redirectUri: payload.client_id as string,
    responseMode: "form_post",
    claims: {
      encryption_key: publicEncryptionKeyJwk,
    },
  });

  const { idToken } = authenticationResponse;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post<
    string,
    AxiosResponse<AkeResponse>
  >(
    `${authorisationApiUrl}/siop-sessions`,
    new URLSearchParams({ id_token: idToken }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await SiopAgent.verifyAkeResponse(
    siopSessionsResponse.data,
    {
      nonce,
      privateEncryptionKeyJwk,
      trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
      alg,
    }
  );

  return accessToken;
};
