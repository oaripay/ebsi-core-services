import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const unsignedTransactionSchema = baseParamSchema.merge(
  z.object({
    from: z.string(),
    to: z.string(),
    data: z.string(),
    nonce: z.string(),
    chainId: z.string(),
    gasLimit: z.string(),
    gasPrice: z.string(),
    value: z.string(),
  }),
);

export type UnsignedTransactionSchema = z.infer<
  typeof unsignedTransactionSchema
>;

export const requestunsignedTransactionDtoSchema = jsonRpcSchema.merge(
  z.object({
    params: z.array(unsignedTransactionSchema).min(1).max(1),
  }),
);
