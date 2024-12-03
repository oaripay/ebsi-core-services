import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { refinements } from "./utils.js";

const { isEthereumAddress, isHexadecimal } = refinements;
export const revokeRecordOwnerSchema = baseParamSchema.merge(
  z.object({
    ownerId: z.string().superRefine(isEthereumAddress),
    recordId: z.string().superRefine(isHexadecimal),
  }),
);

export type RevokeRecordOwnerSchema = z.infer<typeof revokeRecordOwnerSchema>;

export const requestRevokeRecordOwnerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("revokeRecordOwner"),
    params: z.array(revokeRecordOwnerSchema).min(1).max(1),
  }),
);
