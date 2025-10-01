import type {
  EbsiBitstringStatusListCredential,
  EbsiEnvConfiguration,
  VerifyCredentialOptions,
} from "@cef-ebsi/verifiable-credential";

import { verifyCredentialJwt } from "@cef-ebsi/verifiable-credential";
import Joi from "joi";

export type BitstringStatusListCredential = EbsiBitstringStatusListCredential;

export const bitstringStatusListCredentialSchema = Joi.object({
  "@context": Joi.array()
    .ordered(
      Joi.string().valid("https://www.w3.org/2018/credentials/v1").required(),
    )
    .items(Joi.string().uri())
    .required(),
  credentialSubject: Joi.object({
    encodedList: Joi.string().required(),
    id: Joi.string().uri().required(),
    statusPurpose: Joi.string()
      .valid("refresh", "revocation", "suspension", "message")
      .required(),
    ttl: Joi.number().optional(),
    type: Joi.string().valid("BitstringStatusList").required(),
  })
    .unknown(true)
    .required(),
  type: Joi.array()
    .ordered(
      // First item must be "VerifiableCredential"
      Joi.string().valid("VerifiableCredential").required(),
    )
    .items(
      // "BitstringStatusListCredential" must be present
      Joi.string().valid("BitstringStatusListCredential").required(),
      Joi.string(),
    )
    .required(),
})
  // Allow additional properties
  .unknown(true);

export async function checkBitstringStatusListCredential(
  credentialJwt: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  reqId: string,
  options?: VerifyCredentialOptions,
): Promise<{ error: string; success: false } | { success: true }> {
  // Note: we only support VC JWT for now -> the BitstringStatusListCredential must be a JWT
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
      axiosHeaders: { "x-request-id": reqId },
      skipAccreditationsValidation: true, // No need to check the accreditation
    });

    Joi.assert(credential, bitstringStatusListCredentialSchema);
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
