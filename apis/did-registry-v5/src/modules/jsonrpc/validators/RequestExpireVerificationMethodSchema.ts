import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import {
  BigNumber,
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib.esm/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const expireVerificationMethodSchema = baseParamSchema.merge(
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
    notAfter: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
  }),
);

export type ExpireVerificationMethodSchema = z.infer<
  typeof expireVerificationMethodSchema
>;

export const requestExpireVerificationMethodDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("expireVerificationMethod"),
    params: z.array(expireVerificationMethodSchema).min(1).max(1),
  }),
);
