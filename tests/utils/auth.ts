import { URLSearchParams } from "node:url";
import { randomUUID } from "node:crypto";
import axios, { AxiosResponse } from "axios";
import {
  Agent as SiopAgent,
  AkeResponse as SiopAkeResponse,
  encode,
  verifyJwtTar,
} from "@cef-ebsi/siop-auth";
import { exportJWK, generateKeyPair, importJWK, JWK } from "jose";

export const requestSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  authorisationApiUrl,
  trustedAppsRegistryApiUrl,
  syntaxType = "jwk_thumbprint_subject",
}: {
  clientKid: string;
  clientPrivateKey: string | JWK;
  authorisationApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  syntaxType?: "jwk_thumbprint_subject" | "did_subject";
}): Promise<string> => {
  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  const siopAgent = new SiopAgent({
    privateKey: await importJWK(
      typeof clientPrivateKey === "string"
        ? encode.privateKey.fromHextoJWK(clientPrivateKey)
        : clientPrivateKey,
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

  const { payload } = await verifyJwtTar(urlParams.get("request") || "", {
    trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
  });

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const authenticationResponse = await siopAgent.createResponse(
    {
      nonce,
      redirectUri: payload.client_id as string,
      claims: {
        encryption_key: publicEncryptionKeyJwk,
      },
    },
    {
      responseMode: "form_post",
      syntaxType,
    }
  );

  const { idToken } = authenticationResponse;

  if (!idToken) {
    throw new Error("Missing idToken");
  }

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

export default requestSiopJwt;
