import {
  createVerifiablePresentation,
  VerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import { VerifiableCredential } from "@cef-ebsi/verifiable-credential";
import { createJWT, ES256KSigner } from "did-jwt";
import { base64url } from "multiformats/bases/base64";
import { JWTPayload } from "jose/types";

const extractIatFromJwt = (jwt: string): number => {
  const token = jwt.split(".");
  const payload = Buffer.from(base64url.baseDecode(token[1])).toString();
  return (JSON.parse(payload) as JWTPayload).iat;
};

export async function createVP({
  vc,
  didRegistry,
  trustedIssuersRegistryApiUrl,
  clientDid,
  clientPrivateKey,
}: {
  vc: VerifiableCredential;
  didRegistry: string;
  trustedIssuersRegistryApiUrl: string;
  clientDid: string;
  clientPrivateKey: string;
}): Promise<VerifiablePresentation> {
  const options = {
    resolver: didRegistry,
    tirUrl: `${trustedIssuersRegistryApiUrl}/issuers`,
  };

  const requiredProof = {
    type: "EcdsaSecp256k1Signature2019",
    proofPurpose: "assertionMethod",
    verificationMethod: `${clientDid}#keys-1`,
  };

  const presentation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: "VerifiablePresentation",
    verifiableCredential: [vc],
    holder: clientDid,
  };

  const vpSigner = ES256KSigner(clientPrivateKey);

  const jwtdata = await createJWT(
    presentation,
    {
      alg: "ES256K",
      issuer: clientDid,
      signer: vpSigner,
      // canonicalize: true,
    },
    {
      alg: "ES256K",
      typ: "JWT",
      kid: `${options.resolver}/${clientDid}#keys-1`,
    }
  );
  const vpToken = jwtdata.split(".");

  const signatureValue = {
    proofValue: `${vpToken[0]}..${vpToken[2]}`,
    proofValueName: "jws",
    iat: extractIatFromJwt(jwtdata),
  };

  return createVerifiablePresentation(
    presentation,
    requiredProof,
    signatureValue,
    options
  );
}

export default createVP;
