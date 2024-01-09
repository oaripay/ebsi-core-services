import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { refinements } from "./utils.js";

const { isHexadecimal, isHexadecimalJSON } = refinements;

export const updateMetadataSchema = baseParamSchema.merge(
  z.object({
    schemaRevisionId: z.string().superRefine(isHexadecimal),

    metadata: z.string().superRefine(isHexadecimalJSON),
  }),
);

export type UpdateMetadataSchema = z.infer<typeof updateMetadataSchema>;

export const requestUpdateMetadataSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("updateMetadata"),
    params: z.array(updateMetadataSchema).min(1).max(1),
  }),
);
