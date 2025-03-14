import type {
  EbsiEnvConfiguration,
  EbsiVerifiableAttestation,
  VerifyCredentialOptions,
} from "@cef-ebsi/verifiable-credential";

import { verifyCredentialJwt } from "@cef-ebsi/verifiable-credential";
import Joi from "joi";

// StatusList2021Credential extends Credential type
// https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021credential
export interface StatusList2021Credential extends EbsiVerifiableAttestation {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    ...string[],
  ];
  credentialSubject: {
    encodedList: string;
    id: string;
    statusPurpose: "revocation" | "suspension";
    type: "StatusList2021";
  };
  type: ["VerifiableCredential", ...string[]];
}

export const statusList2021CredentialSchema = Joi.object({
  "@context": Joi.array()
    .ordered(
      Joi.string().valid("https://www.w3.org/2018/credentials/v1").required(),
      Joi.string().valid("https://w3id.org/vc/status-list/2021/v1").required(),
    )
    .items(Joi.string().uri())
    .required(),
  credentialSubject: Joi.object({
    encodedList: Joi.string().required(),
    id: Joi.string().uri().required(),
    statusPurpose: Joi.string().valid("revocation", "suspension").required(),
    type: Joi.string().valid("StatusList2021").required(),
  })
    .unknown(true)
    .required(),
  type: Joi.array()
    .ordered(
      // First item must be "VerifiableCredential"
      Joi.string().valid("VerifiableCredential").required(),
    )
    .items(
      // "StatusList2021Credential" must be present
      Joi.string().valid("StatusList2021Credential").required(),
      Joi.string(),
    )
    .required(),
})
  // Allow additional properties
  .unknown(true);

export async function checkStatusList2021Credential(
  credentialJwt: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  options?: VerifyCredentialOptions,
): Promise<{ error: string; success: false } | { success: true }> {
  // Note: we only support VC JWT for now -> the StatusList2021Credential must be a JWT
  if (!credentialJwt || typeof credentialJwt !== "string") {
    return {
      error: "JWT is not a string",
      success: false,
    };
  }

  try {
    // Verify credential and its signature
    const credential = await verifyCredentialJwt(credentialJwt, ebsiEnvConfig, {
      ...options,
      skipAccreditationsValidation: true, // No need to check the accreditation
    });

    Joi.assert(credential, statusList2021CredentialSchema);
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      error: errorMessage,
      success: false,
    };
  }

  return { success: true };
}

export async function isStatusList2021Credential(
  credentialJwt: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  options?: Omit<VerifyCredentialOptions, "hosts" | "network">,
): Promise<boolean> {
  const { success } = await checkStatusList2021Credential(
    credentialJwt,
    ebsiEnvConfig,
    options,
  );

  return success;
}
