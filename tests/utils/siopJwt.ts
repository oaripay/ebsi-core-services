import querystring from "querystring";
import axios from "axios";
import {
  EbsiDidAuth,
  Agent as SiopAgent,
  DidAuthResponseMode,
} from "@cef-ebsi/siop-auth";
import type { AkeResponse } from "@cef-ebsi/siop-auth/dist/Ake";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { v4 as uuidv4 } from "uuid";
import canonicalize from "canonicalize";
import base64url from "base64url";
import { createVP } from "./verifiablePresentation";
import { createVerifiableAuthorisation } from "./verifiableAuthorisation";

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

  const payload = await EbsiDidAuth.verifyAuthenticationRequest(
    uriDecoded.request,
    didRegistry
  );

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = uuidv4();

  const authenticationResponse = await EbsiDidAuth.createAuthenticationResponse(
    {
      hexPrivateKey: `0x${clientPrivateKey}`,
      did: clientDid,
      nonce,
      redirectUri: payload.client_id,
      responseMode: DidAuthResponseMode.FORM_POST,
    }
  );

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
  const siopAgent = new SiopAgent({
    privateKey: `0x${clientPrivateKey}`,
    didRegistry,
  });

  const accessToken = await siopAgent.verifyAuthenticationResponse(
    siopSessionsResponse.data,
    nonce
  );

  return accessToken;
};

// Get SIOP JWT as a new (unregistered) user
export const requestNewUserSiopJwt = async ({
  didRegistry,
  clientDid,
  clientPrivateKey,
  authorisationApiUrl,
  trustedIssuersRegistryApiUrl,
  authorisationCredentialSchema,
  usersOnboardingApiPrivateKey,
  usersOnboardingApiDid,
}: {
  didRegistry: string;
  clientDid: string;
  clientPrivateKey: string;
  authorisationApiUrl: string;
  trustedIssuersRegistryApiUrl: string;
  authorisationCredentialSchema: string;
  usersOnboardingApiPrivateKey: string;
  usersOnboardingApiDid: string;
}): Promise<string> => {
  const publicKeyEncryption = new EbsiWallet(clientPrivateKey).getPublicKey({
    format: "jwk",
  }) as JsonWebKey;
  const verifiableCredential = await createVerifiableAuthorisation(
    clientDid,
    authorisationCredentialSchema,
    usersOnboardingApiPrivateKey,
    usersOnboardingApiDid,
    didRegistry
  );

  const nonce = uuidv4();

  const verifiablePresentation = await createVP({
    vc: verifiableCredential,
    didRegistry,
    trustedIssuersRegistryApiUrl,
    clientDid,
    clientPrivateKey,
  });

  const canonicalizedVP = base64url.encode(
    canonicalize(verifiablePresentation)
  );

  const authenticationResponse = await EbsiDidAuth.createAuthenticationResponse(
    {
      hexPrivateKey: clientPrivateKey,
      did: clientDid,
      nonce,
      redirectUri: "/siop-sessions",
      responseMode: DidAuthResponseMode.FORM_POST,
      claims: {
        verified_claims: canonicalizedVP,
        encryption_key: publicKeyEncryption,
      },
    }
  );

  const authResponseDecoded = querystring.decode(
    authenticationResponse.bodyEncoded
  );

  const idToken = authResponseDecoded.id_token;

  const siopSessionsResponse = await axios.post(
    `${authorisationApiUrl}/siop-sessions`,
    { id_token: idToken }
  );

  const agent = new SiopAgent({
    privateKey: clientPrivateKey.slice(2),
    didRegistry,
  });

  const accessToken = await agent.verifyAuthenticationResponse(
    siopSessionsResponse.data,
    nonce
  );

  return accessToken;
};
