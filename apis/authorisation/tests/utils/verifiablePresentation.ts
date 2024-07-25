import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";

export async function createVpJwt(
  holderDid: string,
  holderPrivateKey: Uint8Array,
  vc: string,
  audience: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  alg: "ES256" | "ES256K" | "EdDSA" = "ES256K",
): Promise<string> {
  const presentation: EbsiVerifiablePresentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vc],
    holder: holderDid,
  };

  const publicKeyJwk = await getPublicKeyJwk(holderPrivateKey, alg);

  const holder = {
    did: holderDid,
    kid: `${holderDid}#${publicKeyJwk.kid}`,
    alg,
    signer: getSigner(holderPrivateKey, alg),
  } satisfies EbsiIssuer;

  const jwt = await createVerifiablePresentationJwt(
    presentation,
    holder,
    audience,
    {
      ...ebsiEnvConfig,
      skipValidation: true,
    },
  );

  return jwt;
}

export default createVpJwt;
