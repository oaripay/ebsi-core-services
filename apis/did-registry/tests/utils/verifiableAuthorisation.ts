import { randomUUID } from "node:crypto";
import {
  createVerifiableCredentialJwt,
  type EbsiEnvConfiguration,
  type EbsiIssuer,
  type EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import { getSigner } from "@ebsiint-api/shared";
import { fromUrl } from "@cef-ebsi/ebsi-uri";

export async function createVerifiableAuthorisation(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: Uint8Array,
  applicationDid: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  uriType: "URL" | "EBSI URI",
): Promise<string> {
  const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182, // 365/2 = 6 months
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
      id:
        uriType === "EBSI URI"
          ? fromUrl(authorisationCredentialSchema)
          : authorisationCredentialSchema,
      type: "FullJsonSchemaValidator2021",
    },
  };

  const issuer = {
    did: applicationDid,
    signer: getSigner(privateKey, "ES256K"),
    alg: "ES256K",
    kid: `${applicationDid}#keys-1`,
  } satisfies EbsiIssuer;

  return createVerifiableCredentialJwt(credential, issuer, {
    ...ebsiEnvConfig,
    skipValidation: true,
  });
}

export default createVerifiableAuthorisation;
