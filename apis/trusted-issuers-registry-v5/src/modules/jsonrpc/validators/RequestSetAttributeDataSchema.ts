import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import validator from "validator";
import type { Tir } from "@ebsiint-sc/trusted-issuers-registry-v3";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

const { isHexadecimal } = validator.default;

export const setAttributeDataSchema = (tir: Tir) =>
  baseParamSchema
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
        const attr = await tir.getIssuerAttributeByHash(attributeId);

        if (attr.did !== did) {
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

export type SetAttributeDataSchema = z.infer<
  ReturnType<typeof setAttributeDataSchema>
>;

export const requestSetAttributeDataSchema = (tir: Tir) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("setAttributeData"),
      params: z.array(setAttributeDataSchema(tir)).min(1).max(1),
    }),
  );
