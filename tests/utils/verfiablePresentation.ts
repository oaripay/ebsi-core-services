import {
  Options,
  RequiredProof,
  VerifiableCredential,
} from "@cef-ebsi/verifiable-credential";
import {
  createVerifiablePresentation,
  Presentation,
  VerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import {
  createJWT,
  decodeJWT,
  ES256KSigner,
  Signer,
  EdDSASigner,
} from "did-jwt";

export async function createVP(
  holderDid: string,
  holderPrivateKey: string,
  vc: VerifiableCredential,
  options: Options,
  alg: "ES256K" | "EdDSA" = "ES256K"
): Promise<VerifiablePresentation> {
  const requiredProof: RequiredProof = {
    type:
      alg === "ES256K" ? "EcdsaSecp256k1Signature2019" : "Ed25519Signature2018",
    proofPurpose: "assertionMethod",
    verificationMethod: `${holderDid}#keys-1`,
  };
  const presentation: Presentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: "VerifiablePresentation",
    verifiableCredential: [vc],
    holder: holderDid,
  };

  let vpSigner: Signer;
  if (alg === "ES256K") {
    vpSigner = ES256KSigner(holderPrivateKey);
  } else {
    vpSigner = EdDSASigner(holderPrivateKey);
  }

  const jwtdata = await createJWT(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    presentation,
    {
      alg,
      issuer: holderDid,
      signer: vpSigner,
      canonicalize: true,
    },
    {
      alg,
      typ: "JWT",
      kid: `${options.resolver}/${holderDid}#keys-1`,
    }
  );
  const vpToken = jwtdata.split(".");

  const signatureValue = {
    proofValue: `${vpToken[0]}..${vpToken[2]}`,
    proofValueName: "jws",
    iat: decodeJWT(jwtdata).payload.iat,
  };
  return createVerifiablePresentation(
    presentation,
    requiredProof,
    signatureValue,
    options
  );
}

export default createVP;
