import { randomUUID } from "node:crypto";
import {
  createVerifiableCredentialJwt,
  type EbsiEnvConfiguration,
  type EbsiIssuer,
  type EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import elliptic from "elliptic";
import { base64url } from "multiformats/bases/base64";
import { bytes } from "multiformats";
import { fromUrl } from "@cef-ebsi/ebsi-uri";

export async function createVerifiableAuthorisationJwt(
  subjectDid: string,
  authorisationCredentialSchema: string,
  privateKey: string,
  applicationDid: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  uriType: "URL" | "EBSI URI",
): Promise<string> {
  const issuanceDate = new Date();
  const expirationDate = new Date(
    issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182, // 365/2 = 6 months
  );

  const EC = elliptic.ec;
  const ec = new EC("secp256k1");
  const hex = privateKey.replace(/^0x/, "");
  const pubPoint = ec.keyFromPrivate(hex, "hex").getPublic();
  const issuerPublicKeyJwk = {
    kty: "EC",
    crv: "secp256k1",
    x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
  };
  const issuerPrivateKeyJwk = {
    ...issuerPublicKeyJwk,
    d: base64url.baseEncode(bytes.fromHex(hex)),
  };

  const issuer: EbsiIssuer = {
    did: applicationDid,
    kid: `${applicationDid}#keys-1`,
    publicKeyJwk: issuerPublicKeyJwk,
    privateKeyJwk: issuerPrivateKeyJwk,
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
