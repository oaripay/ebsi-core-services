import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal, isHexadecimalJSON, hasValidSchemaId } = refinements;

export const updateSchemaSchema = baseParamSchema
  .merge(
    z.object({
      schemaId: z.string().superRefine(isHexadecimal),

      schema: z.string().superRefine(isHexadecimalJSON),

      metadata: z.string().superRefine(isHexadecimalJSON),
    }),
  )
  .superRefine(hasValidSchemaId);

export type UpdateSchemaSchema = z.infer<typeof updateSchemaSchema>;

export const requestUpdateSchemaSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("updateSchema"),
    params: z.array(updateSchemaSchema).min(1).max(1),
  }),
);
