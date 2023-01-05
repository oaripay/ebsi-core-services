import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import axios, { AxiosResponse } from "axios";
import {
  Agent as SiopAgent,
  AkeResponse as SiopAkeResponse,
  encode,
  verifyJwtTar,
} from "@cef-ebsi/siop-auth";
import { exportJWK, generateKeyPair, importJWK } from "jose";
import { ConfigService } from "@nestjs/config";
import { ApiConfig } from "../../src/config/configuration";

export const requestSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  configService,
}: {
  clientKid: string;
  clientPrivateKey: string;
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> => {
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

  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

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

export default requestSiopJwt;
