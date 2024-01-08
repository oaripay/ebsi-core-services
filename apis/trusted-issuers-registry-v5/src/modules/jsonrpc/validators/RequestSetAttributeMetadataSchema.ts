import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import validator from "validator";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

const { isHexadecimal } = validator.default;

export const setAttributeMetadataSchema = baseParamSchema.merge(
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

    revisionId: z
      .string()
      .refine(isHexadecimal, { message: "Must be hexadecimal" }),

    /**
     * 0: Undefined
     * 1: RootTAO
     * 2: TAO
     * 3: TI
     * 4: Revoked
     */
    issuerType: z.number().min(0).max(4),

    taoDid: z.string().superRefine((val, ctx) => {
      const didValidation = isDidV1(val);
      if (!didValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: didValidation.error,
        });
      }
    }),

    attributeIdTao: z
      .string()
      .refine(isHexadecimal, { message: "Must be hexadecimal" }),
  }),
);

export type SetAttributeMetadataSchema = z.infer<
  typeof setAttributeMetadataSchema
>;

export const requestSetAttributeMetadataSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("setAttributeMetadata"),
    params: z.array(setAttributeMetadataSchema).min(1).max(1),
  }),
);
