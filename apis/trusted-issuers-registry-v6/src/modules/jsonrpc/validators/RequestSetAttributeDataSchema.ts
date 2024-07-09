import { isDidV1, prefixWith0x } from "@ebsiint-api/shared";
import { z } from "zod";
import validator from "validator";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { getBuiltGraphSDK } from "../../../../.graphclient/index.js";

const { isHexadecimal } = validator.default;
const sdk = getBuiltGraphSDK();

export const setAttributeDataSchema = baseParamSchema
  .merge(
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
        .length(66) // 2 -> "0x" + 64 -> sha256
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),

      attributeData: z
        .string()
        .startsWith("0x", "Must be prefixed with 0x")
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),
    }),
  )
  .superRefine(async ({ did, attributeId }, ctx) => {
    try {
      const res = await sdk.GetAttribute({
        did,
        attributeId: prefixWith0x(attributeId),
      });

      if (
        !res.issuer ||
        !res.issuer.attributes ||
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
