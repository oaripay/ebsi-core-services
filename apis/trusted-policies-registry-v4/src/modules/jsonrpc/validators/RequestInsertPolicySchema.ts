import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const insertPolicySchema = baseParamSchema.merge(
  z.object({
    policyName: z.string(),
    description: z.string(),
  }),
);

export type InsertPolicySchema = z.infer<typeof insertPolicySchema>;

export const requestInsertPolicyDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertPolicy"),
    params: z.array(insertPolicySchema).min(1).max(1),
  }),
);
