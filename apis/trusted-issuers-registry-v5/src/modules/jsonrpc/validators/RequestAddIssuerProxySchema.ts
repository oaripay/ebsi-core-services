import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { isIssuerProxy } from "../../../shared/validators/isIssuerProxy.js";

export const createAddIssuerProxySchema = (
  authority: string,
  timeout: number,
  trustedHostnames?: string[],
  ebsiEnvConfig?: EbsiEnvConfiguration,
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
          authority,
          timeout,
          trustedHostnames,
          ebsiEnvConfig,
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
  authority: string,
  timeout: number,
  trustedHostnames?: string[],
  ebsiEnvConfig?: EbsiEnvConfiguration,
) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("addIssuerProxy"),
      params: z
        .array(
          createAddIssuerProxySchema(
            authority,
            timeout,
            trustedHostnames,
            ebsiEnvConfig,
          ),
        )
        .min(1)
        .max(1),
    }),
  );
