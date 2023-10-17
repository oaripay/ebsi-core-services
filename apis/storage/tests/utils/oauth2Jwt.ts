import {
  Agent as OAuth2Agent,
  AkeResponse as OAuth2AkeResponse,
} from "@cef-ebsi/oauth2-auth";
import axios, { type AxiosResponse } from "axios";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../src/config/configuration.js";

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
    "trustedAppsRegistryApiUrl",
  );

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
    trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
  }

  const nonce = randomUUID();

  const agent = new OAuth2Agent({
    privateKey: trustedAppPrivateKey,
    name: trustedAppName,
    trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
  });

  const authRequest = await agent.createRequest("storage-api", {
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
    },
  );

  return agent.verifyAkeResponse(oauth2SessionsResponse.data, { nonce });
}

export default requestOAuth2Jwt;
