import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type {
  EbsiIssuer,
  JWT,
  EbsiVerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import { ES256KSigner, Signer, EdDSASigner } from "did-jwt";
import { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

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
    {
      ebsiEnv,
      skipValidation: true,
      // todo: remove ebsiEnvConfig after libraries are updated
      ...(ebsiEnv === "test" && {
        ebsiEnvConfig: {
          didRegistry:
            "https://api.test.intebsi.xyz/did-registry/v3/identifiers",
          trustedIssuersRegistry:
            "https://api.test.intebsi.xyz/trusted-issuers-registry/v3/issuers",
          trustedSchemasRegistry:
            "https://api.test.intebsi.xyz/trusted-schemas-registry/v2/schemas",
          ebsiVerifiableAttestationSchemaUrl:
            "https://api.test.intebsi.xyz/trusted-schemas-registry/v1/schemas/0x28d76954924d1c4747a4f1f9e3e9edc9ca965efbf8ff20e4339c2bf2323a5773",
          ebsiVerifiablePresentationSchemaUrl:
            "https://api.test.intebsi.xyz/trusted-schemas-registry/v2/schemas/0x7e53dd8c85ffdbf0fff15599e887d6221ab02982d24d857aae1b3d2cc294f048",
        } as EbsiEnvConfiguration,
      }),
    }
  );

  return jwt;
}

export default createVpJwt;
