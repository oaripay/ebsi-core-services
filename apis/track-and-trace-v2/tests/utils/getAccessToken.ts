import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import {
  createVerifiablePresentationJwt,
  type EbsiIssuer,
} from "@cef-ebsi/verifiable-presentation";
import axios from "axios";
import { createJWT, hexToBytes } from "did-jwt";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";

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
      typ: "JWT",
      kid: authApiKid,
    },
  );

  return newUserAccessToken;
}

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
      typ: "JWT",
      kid: authApiKid,
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
    if (typeof vc === "string") verifiableCredential = [vc];
    else verifiableCredential = vc;
  }
  const vpPayload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential,
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
    definition_id: `${scope.replace("openid ", "")}_presentation`,
    descriptor_map: [] as unknown[],
  };

  if (scope === "openid tnt_authorise") {
    presentationSubmission.descriptor_map.push({
      id: "tnt_authorise_credential",
      format: "jwt_vp",
      path: "$",
      path_nested: {
        id: "tnt_authorise_credential",
        format: "jwt_vc",
        path: "$.vp.verifiableCredential[0]",
      },
    });
  }

  try {
    const response = await axios.post(
      `${authorisationApiUrl}/token`,
      new URLSearchParams({
        grant_type: "vp_token",
        scope,
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
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw new Error(JSON.stringify(e.response?.data), { cause: e.cause });
    }

    throw e;
  }
}
