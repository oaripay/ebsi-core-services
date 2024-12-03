import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

import { isDidV1 } from "@ebsiint-api/shared";
import validator from "validator";
import { z } from "zod";

import { isIssuerProxy } from "../../../shared/validators/isIssuerProxy.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";

const { isHexadecimal } = validator.default;

// Until https://github.com/colinhacks/zod/pull/3023 is merged, we can't pass context when running safeParse
// Therefore, we create the schemas dynamically.
export const createUpdateIssuerProxySchema = (
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

      proxyId: z
        .string()
        .startsWith("0x", "Must be prefixed with 0x")
        .length(66) // 2 -> "0x" + 64 -> sha256
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),
    }),
  );

export type UpdateIssuerProxySchema = z.infer<
  ReturnType<typeof createUpdateIssuerProxySchema>
>;

export const createRequestUpdateIssuerProxySchema = (
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("updateIssuerProxy"),
      params: z
        .array(createUpdateIssuerProxySchema(ebsiEnvConfig, timeout))
        .min(1)
        .max(1),
    }),
  );
