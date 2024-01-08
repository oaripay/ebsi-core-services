import {
  isVerificationMethodId,
  isBaseDocument,
  isDidV1,
  isPublicKeyHex,
} from "@ebsiint-api/shared";
import { z } from "zod";
import {
  BigNumber,
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib.esm/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const insertDidDocumentSchema = baseParamSchema
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
      baseDocument: z.string().superRefine((val, ctx) => {
        const baseDocumentValidation = isBaseDocument(val);
        if (!baseDocumentValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: baseDocumentValidation.error,
          });
        }
      }),
      publicKey: z.string(),
      vMethodId: z.string(),
      isSecp256k1: z.literal(true),
      notBefore: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gte(0), {
          message: "Number must be greater than or equal to 0",
        }),
      notAfter: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gte(0), {
          message: "Number must be greater than or equal to 0",
        }),
    }),
  )
  .superRefine(async (val, ctx) => {
    const { publicKey, vMethodId } = val;

    const publicKeyHexValidation = isPublicKeyHex(publicKey, true);
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
      true,
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

export type InsertDidDocumentSchema = z.infer<typeof insertDidDocumentSchema>;

export const requestInsertDidDocumentDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertDidDocument"),
    params: z.array(insertDidDocumentSchema).min(1).max(1),
  }),
);
