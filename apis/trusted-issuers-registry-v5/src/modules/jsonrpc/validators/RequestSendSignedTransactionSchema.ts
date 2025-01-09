import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";

const unsignedTransactionSchema = baseParamSchema.merge(
  z.object({
    chainId: z.string(),
    data: z.string(),
    gasLimit: z.string(),
    gasPrice: z.string(),
    nonce: z.string(),
    to: z.string(),
    value: z.string(),
  }),
);

export type UnsignedTransaction = z.infer<typeof unsignedTransactionSchema>;

const sendSignedTransactionSchema = z.object({
  protocol: z.literal("eth"),
  r: z.string().regex(/^0x/),
  s: z.string().regex(/^0x/),
  signedRawTransaction: z.string().regex(/^0x/),
  unsignedTransaction: unsignedTransactionSchema,
  v: z
    .string()
    .regex(/^0x/)
    .refine((v) => [27, 28].includes(Number(v))),
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
