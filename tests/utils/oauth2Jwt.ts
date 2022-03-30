import {
  Agent as OAuth2Agent,
  AkeResponse as OAuth2AkeResponse,
} from "@cef-ebsi/oauth2-auth";
import axios, { AxiosResponse } from "axios";
import { randomUUID } from "crypto";

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
    }
  );

  return agent.verifyAkeResponse(oauth2SessionsResponse.data, { nonce });
}

export default requestOAuth2Jwt;
