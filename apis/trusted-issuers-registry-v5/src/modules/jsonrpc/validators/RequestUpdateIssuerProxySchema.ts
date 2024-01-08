import { z } from "zod";
import { isDidV1 } from "@ebsiint-api/shared";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import validator from "validator";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { isIssuerProxy } from "../../../shared/validators/isIssuerProxy.js";

const { isHexadecimal } = validator.default;

// Until https://github.com/colinhacks/zod/pull/3023 is merged, we can't pass context when running safeParse
// Therefore, we create the schemas dynamically.
export const createUpdateIssuerProxySchema = (
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

      proxyId: z
        .string()
        .length(66) // 2 -> "0x" + 64 -> sha256
        .refine(isHexadecimal, { message: "Must be hexadecimal" }),

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

export type UpdateIssuerProxySchema = z.infer<
  ReturnType<typeof createUpdateIssuerProxySchema>
>;

export const createRequestUpdateIssuerProxySchema = (
  authority: string,
  timeout: number,
  trustedHostnames?: string[],
  ebsiEnvConfig?: EbsiEnvConfiguration,
) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("updateIssuerProxy"),
      params: z
        .array(
          createUpdateIssuerProxySchema(
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
