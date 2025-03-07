import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";

import { isIssuerProxy } from "../../../shared/validators/isIssuerProxy.ts";
import { baseParamSchema } from "./BaseParamSchema.ts";
import { jsonRpcSchema } from "./JsonRpcSchema.ts";

export const createAddIssuerProxySchema = (
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
) =>
  baseParamSchema.merge(
    z.object({
      did: z.string().superRefine((val, ctx) => {
        const didValidation = isDidV1(val);
        if (!didValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: didValidation.error,
          });
        }
      }),

      proxyData: z.string().superRefine(async (val, ctx) => {
        const proxyValidation = await isIssuerProxy(
          val,
          ebsiEnvConfig,
          timeout,
        );

        if (!proxyValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: proxyValidation.error,
          });
        }
      }),
    }),
  );

export type AddIssuerProxySchema = z.infer<
  ReturnType<typeof createAddIssuerProxySchema>
>;

export const createRequestAddIssuerProxySchema = (
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("addIssuerProxy"),
      params: z
        .array(createAddIssuerProxySchema(ebsiEnvConfig, timeout))
        .min(1)
        .max(1),
    }),
  );
