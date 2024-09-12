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

const { isHexadecimal, isEthereumAddress } = refinements;

export const insertRecordOwnerSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
    ownerId: z.string().superRefine(isEthereumAddress),
    notBefore: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
    notAfter: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine((val) => BigNumber.from(val).gte(0), {
        message: "Number must be greater than or equal to 0",
      }),
  }),
);

export type InsertRecordOwnerSchema = z.infer<typeof insertRecordOwnerSchema>;

export const requestInsertRecordOwnerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertRecordOwner"),
    params: z.array(insertRecordOwnerSchema).min(1).max(1),
  }),
);
