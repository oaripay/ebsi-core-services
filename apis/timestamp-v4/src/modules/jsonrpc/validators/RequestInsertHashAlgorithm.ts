import {
  BigNumber,
  type BigNumberish,
  isBigNumberish,
} from "@ethersproject/bignumber/lib/bignumber.js";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { isMultihash } = refinements;

export const insertHashAlgorithmSchema = baseParamSchema.merge(
  z.object({
    ianaName: z.string().optional(),
    multiHash: z.string().superRefine(isMultihash),
    oid: z.string().optional(),
    outputLength: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    status: z.number().int().min(1).max(2),
  }),
);

export type InsertHashAlgorithmSchema = z.infer<
  typeof insertHashAlgorithmSchema
>;

export const requestInsertHashAlgorithmDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertHashAlgorithm"),
    params: z.array(insertHashAlgorithmSchema).min(1).max(1),
  }),
);
