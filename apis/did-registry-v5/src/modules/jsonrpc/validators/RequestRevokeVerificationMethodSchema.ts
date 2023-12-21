import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import { BigNumber } from "ethers";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const revokeVerificationMethodSchema = baseParamSchema.merge(
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
    vMethodId: z.string(),
    notAfter: z.preprocess(
      (val) => (BigNumber.isBigNumber(val) ? val.toNumber() : val),
      z.number().int().min(0),
    ),
  }),
);

export type RevokeVerificationMethodSchema = z.infer<
  typeof revokeVerificationMethodSchema
>;

export const requestRevokeVerificationMethodDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("revokeVerificationMethod"),
    params: z.array(revokeVerificationMethodSchema).min(1).max(1),
  }),
);
