import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import { ES256KSigner } from "did-jwt";

export async function createVP({
  vc,
  clientKid,
  clientPrivateKey,
  audience,
  ebsiEnv,
}: {
  vc: string;
  clientKid: string;
  clientPrivateKey: string;
  audience: string;
  ebsiEnv: "test" | "conformance" | "pilot" | "prod";
}): Promise<string> {
  const clientDid = clientKid.split("#")[0];
  const presentation: EbsiVerifiablePresentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vc],
    holder: clientDid,
  };

  const issuer: EbsiIssuer = {
    did: clientDid,
    signer: ES256KSigner(clientPrivateKey),
    alg: "ES256K",
    kid: clientKid,
  };

  return createVerifiablePresentationJwt(presentation, issuer, audience, {
    ebsiEnv,
    skipValidation: true,
  });
}

export default createVP;
