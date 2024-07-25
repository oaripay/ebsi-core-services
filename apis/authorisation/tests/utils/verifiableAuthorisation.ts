import { randomUUID } from "node:crypto";
import {
  createVerifiableCredentialJwt,
  type EbsiEnvConfiguration,
  type EbsiIssuer,
  type EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import { fromUrl } from "@cef-ebsi/ebsi-uri";
import { ES256KSigner } from "did-jwt";

export async function createVerifiableAuthorisationJwt(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: Uint8Array,
  applicationDid: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  uriType: "URL" | "EBSI URI",
): Promise<string> {
  const issuanceDate = new Date();
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182, // 365/2 = 6 months
  );

  const issuer = {
    did: applicationDid,
    kid: `${applicationDid}#keys-1`,
    signer: ES256KSigner(privateKey),
    alg: "ES256K",
  } satisfies EbsiIssuer;

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
      id:
        uriType === "EBSI URI"
          ? fromUrl(authorisationCredentialSchema)
          : authorisationCredentialSchema,
      type: "FullJsonSchemaValidator2021",
    },
  };

  const jwt = await createVerifiableCredentialJwt(vcPayload, issuer, {
    ...ebsiEnvConfig,
    skipValidation: true,
  });

  return jwt;
}

export default createVerifiableAuthorisationJwt;
