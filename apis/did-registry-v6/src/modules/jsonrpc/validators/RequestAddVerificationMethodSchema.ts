import {
  isVerificationMethodId,
  isDidV1,
  isPublicKeyHex,
} from "@ebsiint-api/shared";
import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const addVerificationMethodSchema = baseParamSchema
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
      publicKey: z.string(),
      vMethodId: z.string(),
      isSecp256k1: z.boolean(),
    }),
  )
  .superRefine(async (val, ctx) => {
    const { publicKey, vMethodId, isSecp256k1 } = val;

    const publicKeyHexValidation = await isPublicKeyHex(publicKey, isSecp256k1);
    if (!publicKeyHexValidation.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicKey"],
        message: publicKeyHexValidation.error,
        fatal: true,
      });

      // Don't validate vMethodId if publicKey is invalid
      return z.NEVER;
    }

    const vMethodIdValidation = await isVerificationMethodId(
      vMethodId,
      isSecp256k1,
      publicKey,
    );

    if (!vMethodIdValidation.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vMethodId"],
        message: vMethodIdValidation.error,
      });
    }

    return z.NEVER;
  });

export type AddVerificationMethodSchema = z.infer<
  typeof addVerificationMethodSchema
>;

export const requestAddVerificationMethodDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("addVerificationMethod"),
    params: z.array(addVerificationMethodSchema).min(1).max(1),
  }),
);
