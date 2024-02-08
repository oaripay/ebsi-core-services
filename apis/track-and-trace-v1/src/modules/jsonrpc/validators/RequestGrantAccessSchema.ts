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

const { isHexadecimal, isSender } = refinements;

export const grantAccessSchema = baseParamSchema.merge(
  z.object({
    documentHash: z.string().superRefine(isHexadecimal),
    grantedByAccount: z.string().superRefine(isSender),
    subjectAccount: z.string().superRefine(isSender),
    grantedByAccType: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine(
        (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
        {
          message: "Number must be 0 (did:ebsi) or 1 (did:key)",
        },
      ),
    subjectAccType: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine(
        (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
        {
          message: "Number must be 0 (did:ebsi) or 1 (did:key)",
        },
      ),
    permission: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine(
        (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
        {
          message: "Number must be 0 (delegate) or 1 (write)",
        },
      ),
  }),
);

export type GrantAccessSchema = z.infer<typeof grantAccessSchema>;

export const requestGrantAccessDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("grantAccess"),
    params: z.array(grantAccessSchema).min(1).max(1),
  }),
);
