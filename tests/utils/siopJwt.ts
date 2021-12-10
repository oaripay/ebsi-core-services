import { randomUUID } from "crypto";
import request from "supertest";
import {
  Agent as SiopAgent,
  AkeResponse,
  DidAuthResponseMode,
} from "@cef-ebsi/siop-auth";

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
  const siopAgent = new SiopAgent({
    privateKey: `0x${clientPrivateKey}`,
    didRegistry,
  });

  // 1. First, the client calls /authentication-requests
  let response = await request(authorisationApiUrl)
    .post("/authentication-requests")
    .send({
      scope: "openid did_authn",
    });

  // 2. The client verifies the response
  const uriDecoded = new URLSearchParams(
    (response.body as { uri: string }).uri.replace("openid://?", "")
  );
  const payload = await siopAgent.verifyAuthenticationRequest(
    uriDecoded.get("request")
  );

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const didAuthJwt = await siopAgent.createAuthenticationResponse({
    did: clientDid,
    nonce,
    redirectUri: payload.client_id,
    responseMode: DidAuthResponseMode.FORM_POST,
  });

  // 4. The client call /siop-sessions with the ID Token
  response = await request(authorisationApiUrl)
    .post("/siop-sessions")
    .send(didAuthJwt.bodyEncoded);

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await siopAgent.verifyAuthenticationResponse(
    response.body as AkeResponse,
    nonce
  );

  return accessToken;
};

export default requestSiopJwt;
