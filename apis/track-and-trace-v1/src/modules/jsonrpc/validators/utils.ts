import { z, type RefinementCtx } from "zod";
import validator from "validator";

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
};

export default refinements;
