import { z, type RefinementCtx } from "zod";
import validator from "validator";
import { isDidV1 } from "@ebsiint-api/shared";
import { util } from "@cef-ebsi/key-did-resolver";
import { hexToDid } from "../../../shared/utils.js";

const validators = validator.default;

function isHexadecimal(
  value: string,
): { success: true } | { success: false; error: string } {
  if (!value.startsWith("0x")) {
    return {
      success: false,
      error: "Must start with 0x",
    };
  }

  if (!validators.isHexadecimal(value)) {
    return {
      success: false,
      error: "Must be hexadecimal",
    };
  }

  return { success: true };
}

function isSender(
  value: string,
): { success: true } | { success: false; error: string } {
  if (!value.startsWith("0x")) {
    return {
      success: false,
      error: "Must start with 0x",
    };
  }

  if (!validators.isHexadecimal(value)) {
    return {
      success: false,
      error: "Must be hexadecimal",
    };
  }

  let did: string;

  try {
    did = hexToDid(value);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }

  // Validate "did:ebsi" DID
  if (did.startsWith("did:ebsi:")) {
    const didValidation = isDidV1(did);
    if (!didValidation.success) {
      return {
        success: false,
        error: didValidation.error,
      };
    }
    return { success: true };
  }

  // Validate "did:key" DID
  if (did.startsWith("did:key:")) {
    try {
      util.validateDid(did);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  // Should be unreachable in theory
  return {
    success: false,
    error: "The DID must either be a did:ebsi DID or a did:key DID",
  };
}

export const refinements = {
  isHexadecimal: (val: string, ctx: RefinementCtx) => {
    const isValid = isHexadecimal(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isValid.error,
        fatal: true,
      });
    }
  },
  isSender: (val: string, ctx: RefinementCtx) => {
    const isValid = isSender(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isValid.error,
        fatal: true,
      });
    }
  },
};

export default refinements;
