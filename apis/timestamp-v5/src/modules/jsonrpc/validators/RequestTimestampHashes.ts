import {
  BigNumber,
  type BigNumberish,
  isBigNumberish,
} from "@ethersproject/bignumber/lib/bignumber.js";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal, isHexadecimalJSON } = refinements;

export const timestampHashesSchema = baseParamSchema.merge(
  z.object({
    hashAlgorithmIds: z.array(
      z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gte(0), {
          message: "Number must be greater than or equal to 0",
        }),
    ),
    hashValues: z.array(z.string().superRefine(isHexadecimal)),
    timestampData: z
      .array(z.string().superRefine(isHexadecimalJSON))
      .optional(),
  }),
);

export type TimestampHashesSchema = z.infer<typeof timestampHashesSchema>;

export const requestTimestampHashesDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("timestampHashes"),
    params: z.array(timestampHashesSchema).min(1).max(1),
  }),
);
