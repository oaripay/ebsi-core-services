import {
  BigNumber,
  type BigNumberish,
  isBigNumberish,
} from "@ethersproject/bignumber/lib/bignumber.js";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal, isSender } = refinements;

export const revokeAccessSchema = baseParamSchema.merge(
  z.object({
    documentHash: z.string().superRefine(isHexadecimal),
    permission: z
      .custom<BigNumberish>((val) => isBigNumberish(val))
      .refine(
        (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
        {
          message: "Number must be 0 (delegate) or 1 (write)",
        },
      ),
    revokedByAccount: z.string().superRefine(isSender),
    subjectAccount: z.string().superRefine(isSender),
  }),
);

export type RevokeAccessSchema = z.infer<typeof revokeAccessSchema>;

export const requestRevokeAccessDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("revokeAccess"),
    params: z.array(revokeAccessSchema).min(1).max(1),
  }),
);
