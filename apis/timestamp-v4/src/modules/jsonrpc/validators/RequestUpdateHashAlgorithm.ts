import { isBigNumberish } from "@ebsiint-api/shared";
import { ethers } from "ethers";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { insertHashAlgorithmSchema } from "./RequestInsertHashAlgorithm.js";

export const updateHashAlgorithmSchema = baseParamSchema.merge(
  insertHashAlgorithmSchema.merge(
    z.object({
      hashAlgorithmId: z
        .custom<ethers.BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => ethers.getBigInt(val) >= 0n, {
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
