import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

import { refinements } from "./utils.js";

const { isHexadecimal, isEthereumAddress } = refinements;
export const revokeRecordOwnerSchema = baseParamSchema.merge(
  z.object({
    recordId: z.string().superRefine(isHexadecimal),
    ownerId: z.string().superRefine(isEthereumAddress),
  }),
);

export type RevokeRecordOwnerSchema = z.infer<typeof revokeRecordOwnerSchema>;

export const requestRevokeRecordOwnerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("revokeRecordOwner"),
    params: z.array(revokeRecordOwnerSchema).min(1).max(1),
  }),
);
