import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";

import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";

export async function getEbsiIssuer(
  privateKey: Uint8Array,
  did: string,
  kid?: string,
) {
  const issuerPublicKeyJwk = await getPublicKeyJwk(privateKey, "ES256");

  const issuer: EbsiIssuer = {
    alg: "ES256",
    did,
    kid: kid ?? `${did}#${issuerPublicKeyJwk.kid}`,
    signer: getSigner(privateKey, "ES256"),
  };
  return issuer;
}

export default getEbsiIssuer;
