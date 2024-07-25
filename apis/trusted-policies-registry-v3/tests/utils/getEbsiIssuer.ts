import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";

export async function getEbsiIssuer(
  privateKey: Uint8Array,
  did: string,
  kid?: string,
) {
  const issuerPublicKeyJwk = await getPublicKeyJwk(privateKey, "ES256");

  const issuer = {
    did,
    kid: kid || `${did}#${issuerPublicKeyJwk.kid}`,
    alg: "ES256",
    signer: getSigner(privateKey, "ES256"),
  } satisfies EbsiIssuer;

  return issuer;
}

export default getEbsiIssuer;
