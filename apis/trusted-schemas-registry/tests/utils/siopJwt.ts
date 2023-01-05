import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import axios from "axios";
import type { AxiosResponse } from "axios";
import { ConfigService } from "@nestjs/config";
import { Agent as SiopAgent, encode, verifyJwtTar } from "@cef-ebsi/siop-auth";
import type { AkeResponse } from "@cef-ebsi/siop-auth";
import { exportJWK, generateKeyPair, importJWK } from "jose";
import { ApiConfig } from "../../src/config/configuration";

export const requestSiopJwt = async (
  configService: ConfigService<ApiConfig, true>
): Promise<string> => {
  const alg = "ES256K";
  const clientKid = configService.get<string>("testAdminKid");
  const clientPrivateKey = configService.get<string>("testAdminPrivateKey");
  let authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  let trustedAppsRegistry = `${configService.get<string>(
    "trustedAppsRegistryApiUrl"
  )}/apps`;

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
    trustedAppsRegistry = trustedAppsRegistry.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain")
    );
  }

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
    trustedAppsRegistry,
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
    AxiosResponse<AkeResponse>
  >(
    `${authorisationApiUrl}/siop-sessions`,
    new URLSearchParams({ id_token: idToken || "" }).toString(),
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
      trustedAppsRegistry,
      alg,
    }
  );

  return accessToken;
};

export default requestSiopJwt;
