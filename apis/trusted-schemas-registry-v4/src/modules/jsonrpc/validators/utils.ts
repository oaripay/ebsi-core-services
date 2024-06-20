import type { JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import { z, type RefinementCtx } from "zod";
import validator from "validator";
import { remove0xPrefix, computeId, prefixWith0x } from "@ebsiint-api/shared";

const validators = validator.default;

const validateSchemaId = async (
  hexJsonSchema: string,
  expectedSchemaId: string,
): Promise<{ success: true } | { success: false; error: string }> => {
  // 1. Hex JSON -> JSON
  const jsonSchema = JSON.parse(
    Buffer.from(remove0xPrefix(hexJsonSchema), "hex").toString("utf8"),
  ) as JSONSchema;

  // 2. Compute schema ID
  const schemaId = await computeId(jsonSchema);
  const actualSchemaId = prefixWith0x(schemaId.toString("hex"));

  // 3. Compare
  if (actualSchemaId !== expectedSchemaId) {
    return {
      success: false,
      error: `"${expectedSchemaId}" is different from the actual schema ID "${actualSchemaId}"`,
    };
  }

  return { success: true };
};

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
  hasValidSchemaId: async (
    val: { schema: string; schemaId: string },
    ctx: RefinementCtx,
  ) => {
    const isValid = await validateSchemaId(val.schema, val.schemaId);
    if (!isValid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isValid.error,
        path: ["schemaId"],
      });
    }
  },
};

export default refinements;
