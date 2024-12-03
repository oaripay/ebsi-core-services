import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { hasValidSchemaId, isHexadecimal, isHexadecimalJSON } = refinements;

export const updateSchemaSchema = baseParamSchema
  .merge(
    z.object({
      metadata: z.string().superRefine(isHexadecimalJSON),

      schema: z.string().superRefine(isHexadecimalJSON),

      schemaId: z.string().superRefine(isHexadecimal),
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
