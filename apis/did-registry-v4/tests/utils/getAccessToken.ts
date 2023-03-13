import { randomUUID } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-presentation";
import axios from "axios";
import qs from "qs";
import { importJWK, SignJWT, base64url, calculateJwkThumbprint } from "jose";
import { ec as EC } from "elliptic";

/**
 * Transform an ES256 private key into a JWK private key.
 *
 * @param hexPrivateKey The compressed ES256 private key
 * @returns The private key as a JWK
 */
function fromHexToJWK(hexPrivateKey: string): JsonWebKey {
  if (!hexPrivateKey || typeof hexPrivateKey !== "string") {
    throw new Error("You must provide a non-empty hexadecimal private key");
  }

  const ec = new EC("p256");

  // Get key pair from hex private key
  const keyPair = ec.keyFromPrivate(hexPrivateKey, "hex");

  // Validate key pair
  const validation = keyPair.validate();
  if (validation.result === false) {
    throw new Error(validation.reason);
  }

  // Format as JWK
  const pubPoint = keyPair.getPublic();
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: base64url.encode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.encode(pubPoint.getY().toBuffer("be", 32)),
    d: base64url.encode(Buffer.from(hexPrivateKey, "hex")),
  };

  return jwk;
}

/**
 * Sign a "didr_invite" access token as the Authorisation API.
 * Useful for bypassing the whole onboarding process (which relies on Conformance API v3).
 */
export async function getDidrInviteAccessToken(
  did: string,
  authApiV3ES256PrivateKey: string
) {
  const authApiPrivateKeyJwk = fromHexToJWK(authApiV3ES256PrivateKey);
  const authApiPrivateKey = await importJWK(authApiPrivateKeyJwk, "ES256");
  const authApiKid = await calculateJwkThumbprint(authApiPrivateKeyJwk);
  const newUserAccessToken = await new SignJWT({
    scp: "openid didr_invite",
    sub: did,
  })
    .setProtectedHeader({
      alg: "ES256",
      typ: "JWT",
      kid: authApiKid,
    })
    .sign(authApiPrivateKey);

  return newUserAccessToken;
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
    descriptor_map: [
      {
        id: "Any type of Verifiable Attestation",
        format: "jwt_vp",
        path: "$",
        path_nested: {
          id: "Any type of Verifiable Attestation",
          format: "jwt_vc",
          path: "$.verifiableCredential[0]",
        },
      },
    ],
  };

  const response = await axios.post(
    `${authorisationApiUrl}/token`,
    qs.stringify({
      grant_type: "vp_token",
      scope: "openid didr_write",
      vp_token: vpJwt,
      presentation_submission: presentationSubmission,
    }),
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

export default getDidrWriteAccessToken;
