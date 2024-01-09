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

export const detachRecordVersionHashSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
    versionId: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    hashValue: z.string().superRefine(isHexadecimal),
  }),
);

export type DetachRecordVersionHashSchema = z.infer<
  typeof detachRecordVersionHashSchema
>;

export const requestDetachRecordVersionHashDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("detachRecordVersionHash"),
    params: z.array(detachRecordVersionHashSchema).min(1).max(1),
  }),
);
