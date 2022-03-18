import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
  EbsiVerifiableAttestation,
  JWT,
} from "@cef-ebsi/verifiable-credential";
import { ES256KSigner } from "did-jwt";
import { randomUUID } from "crypto";

export async function createVerifiableAuthorisationJwt(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: string,
  applicationDid: string,
  ebsiEnv: "test" | "conformance" | "pilot" | "prod"
): Promise<JWT> {
  const issuanceDate = new Date();
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182 // 365/2 = 6 months
  );

  const issuer: EbsiIssuer = {
    did: applicationDid,
    kid: `${applicationDid}#keys-1`,
    signer: ES256KSigner(privateKey),
    alg: "ES256K",
  };

  const vcPayload: EbsiVerifiableAttestation = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `vc:ebsi:authentication#${randomUUID()}`,
    type: ["VerifiableCredential", "VerifiableAuthorisation"],
    issuer: applicationDid,
    issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
    issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
    validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
    expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
    credentialSubject: { id: subjectDid },
    credentialSchema: {
      id: authorisationCredentialSchema,
      type: "FullJsonSchemaValidator2021",
    },
  };

  const jwt = await createVerifiableCredentialJwt(vcPayload, issuer, {
    ebsiEnv,
    skipValidation: true,
  });

  return jwt;
}

export default createVerifiableAuthorisationJwt;
