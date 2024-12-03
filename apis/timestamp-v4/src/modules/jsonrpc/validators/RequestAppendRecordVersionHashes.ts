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

export const appendRecordVersionHashesSchema = baseParamSchema.merge(
  z.object({
    hashAlgorithmIds: z.array(
      z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine((val) => BigNumber.from(val).gte(0), {
          message: "Number must be greater than or equal to 0",
        }),
    ),
    hashValues: z.array(z.string().superRefine(isHexadecimal)),
    recordId: z.string().superRefine(isHexadecimal),
    timestampData: z
      .array(z.string().superRefine(isHexadecimalJSON))
      .optional(),
    versionId: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    versionInfo: z.string().superRefine(isHexadecimalJSON),
  }),
);

export type AppendRecordVersionHashesSchema = z.infer<
  typeof appendRecordVersionHashesSchema
>;

export const requestAppendRecordVersionHashesDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("appendRecordVersionHashes"),
    params: z.array(appendRecordVersionHashesSchema).min(1).max(1),
  }),
);
