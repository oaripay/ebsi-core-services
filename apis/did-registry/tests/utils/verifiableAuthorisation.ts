import { randomUUID } from "node:crypto";
import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import { encode } from "@ebsiint-api/shared";

export async function createVerifiableAuthorisation(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: string,
  applicationDid: string,
  ebsiAuthority: string,
  trustedHostnames?: string[]
): Promise<string> {
  const issuanceDate = new Date();
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182 // 365/2 = 6 months
  );

  const credential: EbsiVerifiableAttestation = {
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

  const privateKeyJwk = encode.privateKey.fromHexToJWK(privateKey);
  const { d, ...publicKeyJwk } = privateKeyJwk;

  const issuer: EbsiIssuer = {
    did: applicationDid,
    privateKeyJwk,
    publicKeyJwk,
    alg: "ES256K",
    kid: `${applicationDid}#keys-1`,
  };

  return createVerifiableCredentialJwt(credential, issuer, {
    ebsiAuthority,
    skipValidation: true,
    trustedHostnames,
  });
}

export default createVerifiableAuthorisation;
