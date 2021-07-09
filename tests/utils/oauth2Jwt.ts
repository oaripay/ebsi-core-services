import { Agent as OAuth2Agent } from "@cef-ebsi/oauth2-auth";
import axios from "axios";
import { randomUUID } from "crypto";

export const requestOAuth2Jwt = async ({
  testAppPrivateKey,
  testAppName,
  testAppKid,
  targetApiName,
  authorisationApiUrl,
}: {
  testAppPrivateKey: string;
  testAppName: string;
  testAppKid: string;
  targetApiName: string;
  authorisationApiUrl: string;
}): Promise<string> => {
  const nonce = randomUUID();
  const oauth2Agent = new OAuth2Agent(testAppPrivateKey, {
    issuer: testAppName,
    kid: testAppKid,
  });

  const oauth2RequestComponent = await oauth2Agent.createRequestPayload(
    targetApiName,
    {
      nonce,
    }
  );

  // Send request payload to Authorisation API
  const oauth2Response = await axios.post(
    `${authorisationApiUrl}/oauth2-sessions`,
    oauth2RequestComponent
  );

  return oauth2Agent.verifyAuthenticationResponse(oauth2Response.data, nonce);
};

export default requestOAuth2Jwt;
