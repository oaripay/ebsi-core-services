import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
// eslint-disable-next-line import/no-extraneous-dependencies
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-presentation";
import axios from "axios";

/**
 * Get an actual "timestamp_write" access token from Authorisation API v4.
 */
export default async function getTimestampWriteAccessToken(
  authorisationApiUrl: string,
  subject: EbsiIssuer,
  trustedHostnames: string[]
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
      trustedHostnames,
      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
      exp: Math.floor(Date.now() / 1000) + 100,
      nbf: Math.floor(Date.now() / 1000) - 100,
    }
  );

  const presentationSubmission = {
    id: randomUUID(),
    definition_id: "timestamp_write_presentation",
    descriptor_map: [],
  };

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      scope: "openid timestamp_write",
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
