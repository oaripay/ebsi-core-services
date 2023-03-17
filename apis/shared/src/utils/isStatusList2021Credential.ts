import {
  EbsiVerifiableAttestation,
  verifyCredentialJwt,
  VerifyCredentialOptions,
} from "@cef-ebsi/verifiable-credential";
import Joi from "joi";

// StatusList2021Credential extends Credential type
// https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021credential
export interface StatusList2021Credential extends EbsiVerifiableAttestation {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    ...string[]
  ];
  type: ["VerifiableCredential", "StatusList2021Credential", ...string[]];
  credentialSubject: {
    id: string;
    type: "StatusList2021";
    statusPurpose: "revocation" | "suspension";
    encodedList: string;
  };
}

export const statusList2021CredentialSchema = Joi.object({
  "@context": Joi.array()
    .ordered(
      Joi.string().valid("https://www.w3.org/2018/credentials/v1").required(),
      Joi.string().valid("https://w3id.org/vc/status-list/2021/v1").required()
    )
    .items(Joi.string().uri())
    .required(),
  type: Joi.array()
    .ordered(
      Joi.string().valid("VerifiableCredential").required(),
      Joi.string().valid("StatusList2021Credential").required()
    )
    .items(Joi.string())
    .required(),
  credentialSubject: Joi.object({
    id: Joi.string().uri().required(),
    type: Joi.string().valid("StatusList2021").required(),
    statusPurpose: Joi.string().valid("revocation", "suspension").required(),
    encodedList: Joi.string().required(),
  })
    .unknown(true)
    .required(),
})
  // Allow additional properties
  .unknown(true);

export async function isStatusList2021Credential(
  credentialJwt: unknown,
  authority: string,
  options?: Omit<VerifyCredentialOptions, "ebsiAuthority">
): Promise<boolean> {
  // Note: we only support VC JWT for now -> the StatusList2021Credential must be a JWT
  if (!credentialJwt || typeof credentialJwt !== "string") return false;

  try {
    // Verify credential and its signature
    const credential = await verifyCredentialJwt(credentialJwt, {
      ...options,
      ebsiAuthority: authority,
      skipAccreditationsValidation: true, // No need to check the accreditation
    });

    Joi.assert(credential, statusList2021CredentialSchema);
  } catch {
    return false;
  }

  return true;
}
export default isStatusList2021Credential;
