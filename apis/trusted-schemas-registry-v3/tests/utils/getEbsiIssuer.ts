import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";
import { hexToBytes } from "did-jwt";

export async function getEbsiIssuer(
  privateKeyHex: string,
  did: string,
  kid?: string,
) {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKeyJwk = await getPublicKeyJwk(privateKey, "ES256");

  const issuer: EbsiIssuer = {
    did,
    kid: kid ?? publicKeyJwk.kid,
    alg: "ES256",
    signer: getSigner(privateKey, "ES256"),
  };
  return issuer;
}

export default getEbsiIssuer;
