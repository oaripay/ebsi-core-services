import {
  createCredential,
  createVerifiableCredential,
  RequiredProof,
  SignatureValue,
  VerifiableCredential,
} from "@cef-ebsi/verifiable-credential";
import { createJWT, decodeJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
import { randomUUID } from "crypto";

export async function createVerifiableAuthorisation(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: string,
  applicationDid: string,
  didRegistry: string
): Promise<VerifiableCredential> {
  const issuanceDate = new Date();
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182 // 365/2 = 6 months
  );
  const credential = createCredential({
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
    ],
    id: `vc:ebsi:authentication#${randomUUID()}`,
    type: ["VerifiableCredential", "VerifiableAuthorisation"],
    issuer: applicationDid,
    issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
    validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
    expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
    credentialSubject: { id: subjectDid },
    credentialSchema: {
      id: authorisationCredentialSchema,
      type: "OID",
    },
  });
  const signer = ES256KSigner(privateKey);
  const jwt = await createJWT(
    credential,
    {
      alg: "ES256K",
      issuer: applicationDid,
      signer,
      canonicalize: true,
    },
    {
      alg: "ES256K",
      typ: "JWT",
      kid: `${didRegistry}/${applicationDid}#keys-1`,
    }
  );
  const splitJwt = jwt.split(".");
  const detachedJwt = `${splitJwt[0]}..${splitJwt[2]}`;
  const requiredProof = {
    type: "EcdsaSecp256k1Signature2019",
    proofPurpose: "assertionMethod",
    verificationMethod: `${applicationDid}#keys-1`,
  } as RequiredProof;
  const signatureValue = {
    proofValue: detachedJwt,
    proofValueName: "jws",
    iat: decodeJWT(jwt).payload.iat,
  } as SignatureValue;
  return createVerifiableCredential(credential, requiredProof, signatureValue);
}

export default createVerifiableAuthorisation;
