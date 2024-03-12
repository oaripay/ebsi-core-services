import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import validator from "validator";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

const { isHexadecimal } = validator.default;

export const setAttributeDataSchema = baseParamSchema.merge(
  z.object({
    did: z.string().superRefine((val, ctx) => {
      const didValidation = isDidV1(val);
      if (!didValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: didValidation.error,
        });
      }
    }),

    attributeId: z
      .string()
      .startsWith("0x", "Must be prefixed with 0x")
      .refine(isHexadecimal, { message: "Must be hexadecimal" }),

    attributeData: z
      .string()
      .startsWith("0x", "Must be prefixed with 0x")
      .refine(isHexadecimal, { message: "Must be hexadecimal" }),
  }),
);

export type SetAttributeDataSchema = z.infer<typeof setAttributeDataSchema>;

export const requestSetAttributeDataSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("setAttributeData"),
    params: z.array(setAttributeDataSchema).min(1).max(1),
  }),
);
