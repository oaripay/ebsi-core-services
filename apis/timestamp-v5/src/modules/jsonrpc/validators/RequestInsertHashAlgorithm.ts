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

const { isMultihash } = refinements;

export const insertHashAlgorithmSchema = baseParamSchema.merge(
  z.object({
    outputLength: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    ianaName: z.string().optional(),
    oid: z.string().optional(),
    status: z.number().int().min(1).max(2),
    multiHash: z.string().superRefine(isMultihash),
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
