import querystring from "querystring";
import axios from "axios";
import {
  Agent as SiopAgent,
  DidAuthResponseMode,
  AkeResponse,
} from "@cef-ebsi/siop-auth";
import { randomUUID } from "crypto";

export const requestSiopJwt = async ({
  didRegistry,
  clientDid,
  clientPrivateKey,
  authorisationApiUrl,
}: {
  didRegistry: string;
  clientDid: string;
  clientPrivateKey: string;
  authorisationApiUrl: string;
}): Promise<string> => {
  // 0. Create agent
  const siopAgent = new SiopAgent({
    privateKey: `0x${clientPrivateKey}`,
    didRegistry,
  });

  // 1. First, the client calls /authentication-requests
  const authenticationRequestsResponse = await axios.post<{ uri: string }>(
    `${authorisationApiUrl}/authentication-requests`,
    {
      scope: "openid did_authn",
    }
  );

  // 2. The client verifies the response
  const { uri } = authenticationRequestsResponse.data;
  const uriDecoded = querystring.decode(uri.replace("openid://?", "")) as {
    request: string;
  };

  const payload = await siopAgent.verifyAuthenticationRequest(
    uriDecoded.request
  );

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const authenticationResponse = await siopAgent.createAuthenticationResponse({
    did: clientDid,
    nonce,
    redirectUri: payload.client_id,
    responseMode: DidAuthResponseMode.FORM_POST,
  });

  const authResponseDecoded = querystring.decode(
    authenticationResponse.bodyEncoded ?? ""
  );

  const idToken = authResponseDecoded.id_token;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post<AkeResponse>(
    `${authorisationApiUrl}/siop-sessions`,
    querystring.stringify({ id_token: idToken }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await siopAgent.verifyAuthenticationResponse(
    siopSessionsResponse.data,
    nonce
  );

  return accessToken;
};

export default requestSiopJwt;
