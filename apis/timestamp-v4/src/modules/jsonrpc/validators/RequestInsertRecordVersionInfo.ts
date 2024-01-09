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

export const insertRecordVersionInfoSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
    versionId: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    versionInfo: z.string().superRefine(isHexadecimalJSON),
  }),
);

export type InsertRecordVersionInfoSchema = z.infer<
  typeof insertRecordVersionInfoSchema
>;

export const requestInsertRecordVersionInfoDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertRecordVersionInfo"),
    params: z.array(insertRecordVersionInfoSchema).min(1).max(1),
  }),
);
