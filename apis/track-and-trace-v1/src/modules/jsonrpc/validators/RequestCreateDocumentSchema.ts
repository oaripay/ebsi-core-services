import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import {
  BigNumber,
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal } = refinements;

export const createDocumentSchema = baseParamSchema.merge(
  z.object({
    documentHash: z.string().superRefine(isHexadecimal),
    documentMetadata: z.string(),
    didEbsiCreator: z.string().superRefine((val, ctx) => {
      const didValidation = isDidV1(val);
      if (!didValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: didValidation.error,
        });
      }
    }),
    timestamp: z.optional(
      z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gt(0), {
          message: "Number must be greater than 0",
        }),
    ),
    timestampProof: z.optional(z.string().superRefine(isHexadecimal)),
  }),
);

export type CreateDocumentSchema = z.infer<typeof createDocumentSchema>;

export const requestCreateDocumentDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("createDocument"),
    params: z.array(createDocumentSchema).min(1).max(1),
  }),
);
