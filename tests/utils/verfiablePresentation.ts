import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type {
  EbsiIssuer,
  JWT,
  EbsiVerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import { ES256KSigner, Signer, EdDSASigner } from "did-jwt";

export async function createVpJwt(
  holderDid: string,
  holderPrivateKey: string,
  vc: JWT,
  audience: string,
  ebsiEnv: "test" | "conformance" | "pilot" | "prod",
  alg: "ES256K" | "EdDSA" = "ES256K"
): Promise<JWT> {
  const presentation: EbsiVerifiablePresentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vc],
    holder: holderDid,
  };

  let vpSigner: Signer;
  if (alg === "ES256K") {
    vpSigner = ES256KSigner(holderPrivateKey);
  } else {
    vpSigner = EdDSASigner(holderPrivateKey);
  }

  const issuer: EbsiIssuer = {
    did: holderDid,
    kid: `${holderDid}#keys-1`,
    signer: vpSigner,
    alg: alg === "ES256K" ? "ES256K" : "EdDSA",
  };

  const jwt = await createVerifiablePresentationJwt(
    presentation,
    issuer,
    audience,
    { ebsiEnv, skipValidation: true }
  );

  return jwt;
}

export default createVpJwt;
