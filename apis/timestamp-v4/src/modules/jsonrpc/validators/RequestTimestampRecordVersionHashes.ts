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

export const timestampRecordVersionHashesSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
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

export type TimestampRecordVersionHashesSchema = z.infer<
  typeof timestampRecordVersionHashesSchema
>;

export const requestTimestampRecordVersionHashesDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("timestampRecordVersionHashes"),
    params: z.array(timestampRecordVersionHashesSchema).min(1).max(1),
  }),
);
