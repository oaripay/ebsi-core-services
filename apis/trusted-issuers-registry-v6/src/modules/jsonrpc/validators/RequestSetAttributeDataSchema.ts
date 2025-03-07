import { isDidV1, prefixWith0x } from "@ebsiint-api/shared";
import validator from "validator";
import { z } from "zod";

import { getBuiltGraphSDK } from "../../../../.graphclient/index.js";
import { baseParamSchema } from "./BaseParamSchema.ts";
import { jsonRpcSchema } from "./JsonRpcSchema.ts";

const { isHexadecimal } = validator.default;
const sdk = getBuiltGraphSDK();

export const setAttributeDataSchema = baseParamSchema
  .merge(
    z.object({
      attributeData: z
        .string()
        .startsWith("0x", "Must be prefixed with 0x")
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),

      attributeId: z
        .string()
        .startsWith("0x", "Must be prefixed with 0x")
        .length(66) // 2 -> "0x" + 64 -> sha256
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),

      did: z.string().superRefine((val, ctx) => {
        const didValidation = isDidV1(val);
        if (!didValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: didValidation.error,
          });
        }
      }),
    }),
  )
  .superRefine(async ({ attributeId, did }, ctx) => {
    try {
      const res = await sdk.GetAttribute({
        attributeId: prefixWith0x(attributeId),
        did,
      });

      if (
        !res.issuer?.attributes ||
        res.issuer.attributes.length === 0 ||
        !res.issuer.attributes[0]!.lastRevision
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Attribute ${attributeId} does not relate to ${did}`,
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Attribute ${attributeId} does not exist`,
        path: ["attributeId"],
      });
    }
  });

export type SetAttributeDataSchema = z.infer<typeof setAttributeDataSchema>;

export const requestSetAttributeDataSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("setAttributeData"),
    params: z.array(setAttributeDataSchema).min(1).max(1),
  }),
);
