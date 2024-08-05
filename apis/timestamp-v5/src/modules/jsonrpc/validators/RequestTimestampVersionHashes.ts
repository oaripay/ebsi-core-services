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

export const timestampVersionHashesSchema = baseParamSchema.merge(
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
    versionHash: z.string().superRefine(isHexadecimal),
    versionInfo: z.string().superRefine(isHexadecimalJSON),
  }),
);

export type TimestampVersionHashesSchema = z.infer<
  typeof timestampVersionHashesSchema
>;

export const requestTimestampVersionHashesDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("timestampVersionHashes"),
    params: z.array(timestampVersionHashesSchema).min(1).max(1),
  }),
);
