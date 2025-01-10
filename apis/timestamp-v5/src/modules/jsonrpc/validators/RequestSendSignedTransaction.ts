import { z } from "zod";

import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";

export const unsignedTransactionSchema = baseParamSchema.merge(
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

const sendSignedTransactionSchema = (chainId: string) =>
  z.object({
    protocol: z.literal("eth"),
    r: z.string().regex(/^0x/),
    s: z.string().regex(/^0x/),
    signedRawTransaction: z.string().regex(/^0x/),
    unsignedTransaction: unsignedTransactionSchema,
    v: z
      .string()
      .regex(/^0x/)
      .refine((v) => {
        const chainIdInt = Number.parseInt(chainId, 16);
        return [
          27,
          28,
          // EIP-155 "v" value, see https://eips.ethereum.org/EIPS/eip-155
          chainIdInt * 2 + 35,
          chainIdInt * 2 + 36,
        ].includes(Number(v));
      }),
  });

export type SendSignedTransactionParamsSchema = z.infer<
  ReturnType<typeof sendSignedTransactionSchema>
>;

export const requestSendSignedTransactionDtoSchema = (chainId: string) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("sendSignedTransaction"),
      params: z.array(sendSignedTransactionSchema(chainId)).min(1).max(1),
    }),
  );
