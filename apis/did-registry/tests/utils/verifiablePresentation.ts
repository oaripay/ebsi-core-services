import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type {
  EbsiVerifiablePresentation,
  EbsiVpEnvConfiguration,
} from "@cef-ebsi/verifiable-presentation";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import { encode } from "@ebsiint-api/shared";

export async function createVP({
  vc,
  clientKid,
  clientPrivateKey,
  audience,
  ebsiEnvConfig,
}: {
  vc: string;
  clientKid: string;
  clientPrivateKey: string;
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

  const privateKeyJwk = encode.privateKey.fromHexToJWK(clientPrivateKey);
  const { d, ...publicKeyJwk } = privateKeyJwk;

  const issuer: EbsiIssuer = {
    did: clientDid,
    privateKeyJwk,
    publicKeyJwk,
    alg: "ES256K",
    kid: clientKid,
  };

  return createVerifiablePresentationJwt(presentation, issuer, audience, {
    ...ebsiEnvConfig,
    skipValidation: true,
  });
}

export default createVP;
