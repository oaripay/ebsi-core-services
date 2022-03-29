/* eslint-disable import/no-extraneous-dependencies */
import { URLSearchParams } from "node:url";
import { randomUUID } from "node:crypto";
import axios, { AxiosResponse } from "axios";
import {
  Agent as SiopAgent,
  AkeResponse as SiopAkeResponse,
  encode,
  verifyJwtTar,
} from "@cef-ebsi/siop-auth";
import {
  Agent as OAuth2Agent,
  AkeResponse as OAuth2AkeResponse,
} from "@cef-ebsi/oauth2-auth";
import { exportJWK, generateKeyPair, importJWK } from "jose";

export async function requestOAuth2Jwt({
  trustedAppPrivateKey,
  trustedAppName,
  trustedAppsRegistryApiUrl,
  authorisationApiUrl,
}: {
  trustedAppPrivateKey: string;
  trustedAppName: string;
  trustedAppsRegistryApiUrl: string;
  authorisationApiUrl: string;
}): Promise<string> {
  const nonce = randomUUID();

  const agent = new OAuth2Agent({
    privateKey: trustedAppPrivateKey,
    name: trustedAppName,
    trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
  });

  const authRequest = await agent.createRequest("ledger-api", {
    nonce,
  });

  const oauth2SessionsResponse = await axios.post<
    string,
    AxiosResponse<OAuth2AkeResponse>
  >(
    `${authorisationApiUrl}/oauth2-sessions`,
    new URLSearchParams(authRequest).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return agent.verifyAkeResponse(oauth2SessionsResponse.data, { nonce });
}

export const requestSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  authorisationApiUrl,
  trustedAppsRegistryApiUrl,
}: {
  clientKid: string;
  clientPrivateKey: string;
  authorisationApiUrl: string;
  trustedAppsRegistryApiUrl: string;
}): Promise<string> => {
  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  const siopAgent = new SiopAgent({
    privateKey: await importJWK(
      encode.privateKey.fromHextoJWK(clientPrivateKey),
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
    nonce,
    redirectUri: payload.client_id as string,
    claims: {
      encryption_key: publicEncryptionKeyJwk,
    },
    responseMode: "form_post",
  });

  const { idToken } = authenticationResponse;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post<
    string,
    AxiosResponse<SiopAkeResponse>
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
