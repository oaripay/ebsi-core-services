import { z } from "zod";
import {
  BigNumber,
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { insertHashAlgorithmSchema } from "./RequestInsertHashAlgorithm.js";

export const updateHashAlgorithmSchema = baseParamSchema.merge(
  insertHashAlgorithmSchema.merge(
    z.object({
      hashAlgorithmId: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gte(0), {
          message: "Number must be greater than or equal to 0",
        }),
    }),
  ),
);

export type UpdateHashAlgorithmSchema = z.infer<
  typeof updateHashAlgorithmSchema
>;

export const requestUpdateHashAlgorithmDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("updateHashAlgorithm"),
    params: z.array(updateHashAlgorithmSchema).min(1).max(1),
  }),
);
