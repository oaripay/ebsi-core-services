import type { HashName } from "multihashes";
import type { RefinementCtx } from "zod";

import { remove0xPrefix } from "@ebsiint-api/shared";
import { coerceCode } from "multihashes";
import validator from "validator";
import { z } from "zod";

const validators = validator.default;

function isHexadecimal(
  value: string,
): { error: string; success: false } | { success: true } {
  if (!value.startsWith("0x")) {
    return {
      error: "Must start with 0x",
      success: false,
    };
  }

  if (!validators.isHexadecimal(value)) {
    return {
      error: "Must be hexadecimal",
      success: false,
    };
  }

  return { success: true };
}

function isHexadecimalJSON(
  value: string,
): { error: string; success: false } | { success: true } {
  const isValidHexadecimal = isHexadecimal(value);

  if (!isValidHexadecimal.success) {
    return isValidHexadecimal;
  }

  // Length must be even
  if (value.length % 2 !== 0) {
    return {
      error: "Length must be even",
      success: false,
    };
  }

  if (
    !validators.isJSON(
      Buffer.from(remove0xPrefix(value), "hex").toString("utf8"),
    )
  ) {
    return {
      error: "Must be a JSON object encoded in hexadecimal",
      success: false,
    };
  }

  return { success: true };
}

function isMultihash(
  value: string,
): { error: string; success: false } | { success: true } {
  try {
    coerceCode(value as HashName);
  } catch {
    return {
      error: "Must be multihash",
      success: false,
    };
  }

  return { success: true };
}

export const refinements = {
  isEthereumAddress: (val: string, ctx: RefinementCtx) => {
    if (!validators.isEthereumAddress(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message: "Must be an ethereum address",
      });
    }
  },
  isHexadecimal: (val: string, ctx: RefinementCtx) => {
    const isValid = isHexadecimal(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message: isValid.error,
      });
    }
  },
  isHexadecimalJSON: (val: string, ctx: RefinementCtx) => {
    const isValid = isHexadecimalJSON(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message: isValid.error,
      });
    }
  },
  isMultihash: (val: string, ctx: RefinementCtx) => {
    const isValid = isMultihash(val);

    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message: isValid.error,
      });
    }
  },
};

export default refinements;
