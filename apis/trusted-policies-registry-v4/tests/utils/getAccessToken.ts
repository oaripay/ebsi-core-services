import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import {
  createVerifiablePresentationJwt,
  type EbsiIssuer,
} from "@cef-ebsi/verifiable-presentation";
import axios from "axios";

/**
 * Get an actual "tpr_write" access token from Authorisation API v4.
 */
export async function getTprWriteAccessToken(
  authorisationApiUrl: string,
  subject: EbsiIssuer,
  ebsiEnvConfig: EbsiEnvConfiguration,
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
    definition_id: "tpr_write_presentation",
    descriptor_map: [],
  };

  try {
    const response = await axios.post(
      `${authorisationApiUrl}/token`,
      new URLSearchParams({
        grant_type: "vp_token",
        scope: "openid tpr_write",
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
      // eslint-disable-next-line no-console
      console.error(e.response?.data);
    } else {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    throw new Error("Failed to get access token");
  }
}

export default getTprWriteAccessToken;
