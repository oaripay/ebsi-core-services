import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

import {
  createVerifiablePresentationJwt,
  type EbsiIssuer,
} from "@cef-ebsi/verifiable-presentation";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";
import axios from "axios";
import { createJWT, hexToBytes } from "did-jwt";
import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";

export async function bypassAndGetAccessToken(
  did: string,
  authApiV3ES256PrivateKey: string,
  scope: "openid tnt_authorise" | "openid tnt_create" | "openid tnt_write",
) {
  const authApiPrivateKey = hexToBytes(authApiV3ES256PrivateKey);
  const { kid: authApiKid } = await getPublicKeyJwk(authApiPrivateKey, "ES256");

  const newUserAccessToken = await createJWT(
    {
      scp: scope,
      sub: did,
    },
    {
      issuer: authApiKid,
      signer: getSigner(authApiPrivateKey, "ES256"),
    },
    {
      alg: "ES256",
      kid: authApiKid,
      typ: "JWT",
    },
  );

  return newUserAccessToken;
}

export async function getAccessToken(
  authorisationApiUrl: string,
  issuer: EbsiIssuer,
  scope: "openid tnt_authorise" | "openid tnt_create" | "openid tnt_write",
  ebsiEnvConfig: EbsiEnvConfiguration,
  vc?: string | string[],
) {
  const nonce = randomUUID();
  let verifiableCredential: string[] = [];
  if (vc) {
    verifiableCredential = typeof vc === "string" ? [vc] : vc;
  }
  const vpPayload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    holder: issuer.did,
    type: ["VerifiablePresentation"],
    verifiableCredential,
  };

  const vpJwt = await createVerifiablePresentationJwt(
    vpPayload,
    issuer,
    authorisationApiUrl,
    {
      ...ebsiEnvConfig,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
      nonce,
      skipValidation: true,
    },
  );

  const presentationSubmission = {
    definition_id: `${scope.replace("openid ", "")}_presentation`,
    descriptor_map: [] as unknown[],
    id: randomUUID(),
  };

  if (scope === "openid tnt_authorise") {
    presentationSubmission.descriptor_map.push({
      format: "jwt_vp",
      id: "tnt_authorise_credential",
      path: "$",
      path_nested: {
        format: "jwt_vc",
        id: "tnt_authorise_credential",
        path: "$.vp.verifiableCredential[0]",
      },
    });
  }

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      presentation_submission: JSON.stringify(presentationSubmission),
      scope,
      vp_token: vpJwt,
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

/**
 * Sign a "didr_invite" access token as the Authorisation API.
 * Useful for bypassing the whole onboarding process.
 */
export async function getDidrInviteAccessToken(
  did: string,
  authApiES256PrivateKey: string,
) {
  const authApiPrivateKey = hexToBytes(authApiES256PrivateKey);
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
      kid: authApiKid,
      typ: "JWT",
    },
  );

  return newUserAccessToken;
}
