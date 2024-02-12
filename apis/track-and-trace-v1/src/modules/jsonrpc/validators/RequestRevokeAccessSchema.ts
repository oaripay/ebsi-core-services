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

export const revokeAccessSchema = baseParamSchema.merge(
  z.object({
    documentHash: z.string().superRefine(isHexadecimal),
    revokedByAccount: z.string().superRefine(isSender),
    subjectAccount: z.string().superRefine(isSender),
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

export type RevokeAccessSchema = z.infer<typeof revokeAccessSchema>;

export const requestRevokeAccessDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("revokeAccess"),
    params: z.array(revokeAccessSchema).min(1).max(1),
  }),
);
