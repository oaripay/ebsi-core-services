import { z } from "zod";
import {
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const updatePolicySchema = baseParamSchema.merge(
  z.object({
    policyId: z.optional(
      z.custom<BigNumberish>((val) => isBigNumberish(val), {
        message: "Not an integer string",
      }),
    ),
    policyName: z.optional(z.string()),
    description: z.string(),
  }),
);

export type UpdatePolicySchema = z.infer<typeof updatePolicySchema>;

export const requestUpdatePolicyDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("updatePolicy"),
    params: z.array(updatePolicySchema).min(1).max(1),
  }),
);
