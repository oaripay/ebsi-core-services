import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-presentation";
import axios from "axios";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";
import { createJWT, hexToBytes } from "did-jwt";

/**
 * Sign a "didr_invite" access token as the Authorisation API.
 * Useful for bypassing the whole onboarding process (which relies on Conformance API v3).
 */
export async function getDidrInviteAccessToken(
  did: string,
  authApiV3ES256PrivateKey: string,
) {
  const authApiPrivateKey = hexToBytes(authApiV3ES256PrivateKey);
  const { kid: authApiKid } = await getPublicKeyJwk(authApiPrivateKey, "ES256");

  const newUserAccessToken = await createJWT(
    {
      scp: "openid didr_invite",
      sub: did,
    },
    {
      issuer: authApiKid,
      signer: getSigner(authApiPrivateKey, "ES256"),
    },
    {
      alg: "ES256",
      typ: "JWT",
      kid: authApiKid,
    },
  );

  return newUserAccessToken;
}

/**
 * Get an actual "didr_write" access token from Authorisation API v3.
 */
export async function getDidrWriteAccessToken(
  authorisationApiUrl: string,
  issuer: EbsiIssuer,
  ebsiEnvConfig: EbsiEnvConfiguration,
) {
  const nonce = randomUUID();
  const vpPayload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [],
    holder: issuer.did,
  };

  const vpJwt = await createVerifiablePresentationJwt(
    vpPayload,
    issuer,
    authorisationApiUrl,
    {
      ...ebsiEnvConfig,
      skipValidation: true,
      nonce,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
    },
  );

  const presentationSubmission = {
    id: randomUUID(),
    definition_id: "didr_write_presentation",
    descriptor_map: [],
  };

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      scope: "openid didr_write",
      vp_token: vpJwt,
      presentation_submission: JSON.stringify(presentationSubmission),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  // Decode access token
  const { access_token: accessToken } = response.data as {
    access_token: string;
  };

  return accessToken;
}

export default getDidrWriteAccessToken;
