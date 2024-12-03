import {
  BigNumber,
  type BigNumberish,
  isBigNumberish,
} from "@ethersproject/bignumber/lib/bignumber.js";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { isEthereumAddress, isHexadecimal } = refinements;

export const insertRecordOwnerSchema = baseParamSchema.merge(
  z.object({
    notAfter: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    notBefore: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    ownerId: z.string().superRefine(isEthereumAddress),
    recordId: z.string().superRefine(isHexadecimal),
  }),
);

export type InsertRecordOwnerSchema = z.infer<typeof insertRecordOwnerSchema>;

export const requestInsertRecordOwnerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertRecordOwner"),
    params: z.array(insertRecordOwnerSchema).min(1).max(1),
  }),
);
