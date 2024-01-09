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

const { isHexadecimal, isHexadecimalJSON } = refinements;

export const appendRecordVersionHashesSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
    versionId: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
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
