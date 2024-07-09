import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import baseParamSchema from "./BaseParamSchema.js";

const unsignedTransactionSchema = baseParamSchema.merge(
  z.object({
    to: z.string(),
    data: z.string(),
    nonce: z.string(),
    chainId: z.string(),
    gasLimit: z.string(),
    gasPrice: z.string(),
    value: z.string(),
  }),
);

export type UnsignedTransaction = z.infer<typeof unsignedTransactionSchema>;

const sendSignedTransactionSchema = z.object({
  protocol: z.literal("eth"),
  unsignedTransaction: unsignedTransactionSchema,
  r: z.string().regex(/^0x/),
  s: z.string().regex(/^0x/),
  v: z.string().regex(/^0x/),
  signedRawTransaction: z.string().regex(/^0x/),
});

export type SendSignedTransactionParamsSchema = z.infer<
  typeof sendSignedTransactionSchema
>;

export const requestSendSignedTransactionDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("sendSignedTransaction"),
    params: z.array(sendSignedTransactionSchema).min(1).max(1),
  }),
);
