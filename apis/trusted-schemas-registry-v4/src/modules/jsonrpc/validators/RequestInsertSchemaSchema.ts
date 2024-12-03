import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { hasValidSchemaId, isHexadecimal, isHexadecimalJSON } = refinements;

export const insertSchemaSchema = baseParamSchema
  .merge(
    z.object({
      metadata: z.string().superRefine(isHexadecimalJSON),

      schema: z.string().superRefine(isHexadecimalJSON),

      schemaId: z.string().superRefine(isHexadecimal),
    }),
  )
  .superRefine(hasValidSchemaId);

export type InsertSchemaSchema = z.infer<typeof insertSchemaSchema>;

export const requestInsertSchemaSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertSchema"),
    params: z.array(insertSchemaSchema).min(1).max(1),
  }),
);
