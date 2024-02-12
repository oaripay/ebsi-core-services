import { randomUUID } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { URLSearchParams } from "node:url";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-presentation";
import axios from "axios";
import {
  importJWK,
  SignJWT,
  base64url,
  calculateJwkThumbprint,
  type JWK,
} from "jose";
import elliptic from "elliptic";

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

  const EC = elliptic.ec;
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

export async function bypassAndGetAccessToken(
  did: string,
  authApiV3ES256PrivateKey: string,
  scope: "openid tnt_authorise" | "openid tnt_create" | "openid tnt_write",
) {
  const authApiPrivateKeyJwk = fromHexToJWK(authApiV3ES256PrivateKey);
  const authApiPrivateKey = await importJWK(
    authApiPrivateKeyJwk as JWK,
    "ES256",
  );
  const authApiKid = await calculateJwkThumbprint(authApiPrivateKeyJwk as JWK);
  const newUserAccessToken = await new SignJWT({
    scp: scope,
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

export async function getAccessToken(
  authorisationApiUrl: string,
  issuer: EbsiIssuer,
  scope: "openid tnt_authorise" | "openid tnt_create" | "openid tnt_write",
  trustedHostnames?: string[],
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
      ebsiAuthority: "example.net",
      skipValidation: true,
      nonce,
      ...(trustedHostnames && { trustedHostnames }),
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
}
