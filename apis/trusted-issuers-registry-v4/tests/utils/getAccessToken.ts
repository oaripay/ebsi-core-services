import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-presentation";
import axios from "axios";

/**
 * Get an actual "tir_invite" access token from Authorisation API v3.
 */
export async function getTirInviteAccessToken(
  authorisationApiUrl: string,
  subject: EbsiIssuer,
  vcJwt: string
) {
  const nonce = randomUUID();
  const vpPayload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vcJwt],
    holder: subject.did,
  };

  const vpJwt = await createVerifiablePresentationJwt(
    vpPayload,
    subject,
    authorisationApiUrl,
    {
      ebsiAuthority: "example.net",
      skipValidation: true,
      nonce,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
    }
  );

  const presentationSubmission = {
    id: randomUUID(),
    definition_id: "tir_invite_presentation",
    descriptor_map: [
      {
        id: "tir_invite_credential",
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: "tir_invite_credential",
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      },
    ],
  };

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      scope: "openid tir_invite",
      vp_token: vpJwt,
      presentation_submission: JSON.stringify(presentationSubmission),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // Decode access token
  const { access_token: accessToken } = response.data as {
    access_token: string;
  };

  return accessToken;
}

/**
 * Get an actual "tir_write" access token from Authorisation API v3.
 */
export async function getTirWriteAccessToken(
  authorisationApiUrl: string,
  subject: EbsiIssuer
) {
  const nonce = randomUUID();
  const vpPayload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [],
    holder: subject.did,
  };

  const vpJwt = await createVerifiablePresentationJwt(
    vpPayload,
    subject,
    authorisationApiUrl,
    {
      ebsiAuthority: "example.net",
      skipValidation: true,
      nonce,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
    }
  );

  const presentationSubmission = {
    id: randomUUID(),
    definition_id: "tir_write_presentation",
    descriptor_map: [],
  };

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      scope: "openid tir_write",
      vp_token: vpJwt,
      presentation_submission: JSON.stringify(presentationSubmission),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // Decode access token
  const { access_token: accessToken } = response.data as {
    access_token: string;
  };

  return accessToken;
}

/**
 * Get an actual "didr_write" access token from Authorisation API v3.
 */
export async function getDidrWriteAccessToken(
  authorisationApiUrl: string,
  issuer: EbsiIssuer
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
      ebsiAuthority: "example.net",
      skipValidation: true,
      nonce,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
    }
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
    }
  );

  // Decode access token
  const { access_token: accessToken } = response.data as {
    access_token: string;
  };

  return accessToken;
}
