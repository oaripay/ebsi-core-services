import { z, type RefinementCtx } from "zod";
import validator from "validator";
import { remove0xPrefix } from "@ebsiint-api/shared";
import { coerceCode, HashName } from "multihashes";

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

function isHexadecimalJSON(
  value: string,
): { success: true } | { success: false; error: string } {
  const isValidHexadecimal = isHexadecimal(value);

  if (!isValidHexadecimal.success) {
    return isValidHexadecimal;
  }

  // Length must be even
  if (value.length % 2 !== 0) {
    return {
      success: false,
      error: "Length must be even",
    };
  }

  if (
    !validators.isJSON(
      Buffer.from(remove0xPrefix(value), "hex").toString("utf8"),
    )
  ) {
    return {
      success: false,
      error: "Must be a JSON object encoded in hexadecimal",
    };
  }

  return { success: true };
}

function isMultihash(
  value: string,
): { success: true } | { success: false; error: string } {
  try {
    coerceCode(value as HashName);
  } catch {
    return {
      success: false,
      error: "Must be multihash",
    };
  }

  return { success: true };
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
  isHexadecimalJSON: (val: string, ctx: RefinementCtx) => {
    const isValid = isHexadecimalJSON(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isValid.error,
        fatal: true,
      });
    }
  },
  isMultihash: (val: string, ctx: RefinementCtx) => {
    const isValid = isMultihash(val);

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
