import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { calculateJwkThumbprint, type JWK } from "jose";

export async function createVpJwt(
  holderDid: string,
  holderPublicKeyJwk: JWK,
  holderPrivateKeyJwk: JWK,
  vc: string,
  audience: string,
  ebsiAuthority: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  alg: "ES256" | "ES256K" | "EdDSA" = "ES256K",
  trustedHostnames?: string[],
): Promise<string> {
  const presentation: EbsiVerifiablePresentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vc],
    holder: holderDid,
  };

  const thumbprint = await calculateJwkThumbprint(holderPublicKeyJwk);

  const holder: EbsiIssuer = {
    did: holderDid,
    kid: `${holderDid}#${thumbprint}`,
    alg,
    publicKeyJwk: holderPublicKeyJwk,
    privateKeyJwk: holderPrivateKeyJwk,
  };

  const jwt = await createVerifiablePresentationJwt(
    presentation,
    holder,
    audience,
    {
      ebsiAuthority,
      ebsiEnvConfig,
      skipValidation: true,
      ...(trustedHostnames && { trustedHostnames }),
    },
  );

  return jwt;
}

export default createVpJwt;
