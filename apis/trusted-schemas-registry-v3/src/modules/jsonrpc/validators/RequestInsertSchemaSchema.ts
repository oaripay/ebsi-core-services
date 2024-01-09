import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal, isHexadecimalJSON, hasValidSchemaId } = refinements;

export const insertSchemaSchema = baseParamSchema
  .merge(
    z.object({
      schemaId: z.string().superRefine(isHexadecimal),

      schema: z.string().superRefine(isHexadecimalJSON),

      metadata: z.string().superRefine(isHexadecimalJSON),
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
