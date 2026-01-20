import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";

import { hexToBytes } from "@cef-ebsi/did-jwt";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";

export async function getEbsiIssuer(
  privateKeyHex: string,
  did: string,
  kid?: string,
) {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKeyJwk = await getPublicKeyJwk(privateKey, "ES256");

  const issuer: EbsiIssuer = {
    alg: "ES256",
    did,
    kid: kid ?? `${did}#${publicKeyJwk.kid}`,
    signer: getSigner(privateKey, "ES256"),
  };
  return issuer;
}
