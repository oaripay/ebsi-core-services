import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type {
  EbsiVerifiablePresentation,
  EbsiVpEnvConfiguration,
} from "@cef-ebsi/verifiable-presentation";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import { getSigner } from "@ebsiint-api/shared";

export async function createVP({
  vc,
  clientKid,
  clientPrivateKey,
  audience,
  ebsiEnvConfig,
}: {
  vc: string;
  clientKid: string;
  clientPrivateKey: Uint8Array;
  audience: string;
  ebsiEnvConfig: EbsiVpEnvConfiguration;
}): Promise<string> {
  const clientDid = clientKid.split("#")[0]!;
  const presentation: EbsiVerifiablePresentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [vc],
    holder: clientDid,
  };

  const issuer = {
    did: clientDid,
    signer: getSigner(clientPrivateKey, "ES256K"),
    alg: "ES256K",
    kid: clientKid,
  } satisfies EbsiIssuer;

  return createVerifiablePresentationJwt(presentation, issuer, audience, {
    ...ebsiEnvConfig,
    skipValidation: true,
  });
}

export default createVP;
