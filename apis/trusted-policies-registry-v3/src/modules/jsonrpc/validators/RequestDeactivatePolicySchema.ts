import {
  type BigNumberish,
  isBigNumberish,
} from "@ethersproject/bignumber/lib/bignumber.js";
import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";

export const deactivatePolicySchema = baseParamSchema.merge(
  z.object({
    policyId: z.optional(
      z.custom<BigNumberish>((val) => isBigNumberish(val), {
        message: "Not an integer string",
      }),
    ),
    policyName: z.optional(z.string()),
  }),
);

export type DeactivatePolicySchema = z.infer<typeof deactivatePolicySchema>;

export const requestDeactivatePolicyDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("deactivatePolicy"),
    params: z.array(deactivatePolicySchema).min(1).max(1),
  }),
);
