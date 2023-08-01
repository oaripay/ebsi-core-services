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
  type: ["VerifiableCredential", ...string[]];
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
      // First item must be "VerifiableCredential"
      Joi.string().valid("VerifiableCredential").required()
    )
    .items(
      // "StatusList2021Credential" must be present
      Joi.string().valid("StatusList2021Credential").required(),
      Joi.string()
    )
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

export async function checkStatusList2021Credential(
  credentialJwt: unknown,
  authority: string,
  options?: Omit<VerifyCredentialOptions, "ebsiAuthority">
): Promise<{ success: boolean; error?: string }> {
  // Note: we only support VC JWT for now -> the StatusList2021Credential must be a JWT
  if (!credentialJwt || typeof credentialJwt !== "string")
    return {
      success: false,
      error: "JWT is not a string",
    };

  try {
    // Verify credential and its signature
    const credential = await verifyCredentialJwt(credentialJwt, {
      ...options,
      ebsiAuthority: authority,
      skipAccreditationsValidation: true, // No need to check the accreditation
    });

    Joi.assert(credential, statusList2021CredentialSchema);
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }

  return { success: true };
}

export async function isStatusList2021Credential(
  credentialJwt: unknown,
  authority: string,
  options?: Omit<VerifyCredentialOptions, "ebsiAuthority">
): Promise<boolean> {
  return (
    await checkStatusList2021Credential(credentialJwt, authority, options)
  ).success;
}

export default isStatusList2021Credential;
