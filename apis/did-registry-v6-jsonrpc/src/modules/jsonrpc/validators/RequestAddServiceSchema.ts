import { isDidV1 } from "@ebsiint-api/shared";
import { ZodError, z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

const credentialRegistryServiceEndpointSchema = z.object({
  byId: z.string().optional(),
  byType: z.string().optional(),
});

const serviceSchema = z.object({
  /**
   * ZOD does not have validations for URI, only URL
   * https://www.w3.org/TR/did-core/#services
   */
  id: z.string(),
  type: z.string().or(z.set(z.string().min(1))),
  serviceEndpoint: z
    .string()
    .or(credentialRegistryServiceEndpointSchema)
    .or(z.set(z.string().or(z.object({})))),
});

function isServiceDocument(
  value: string,
): { success: true } | { success: false; error: string | ZodError } {
  let documentService = null;
  try {
    documentService = JSON.parse(value) as unknown;
  } catch (ex) {
    return { success: false, error: "Unable to parse JSON" };
  }

  const parsedServiceSchema = serviceSchema.safeParse(documentService);

  if (!parsedServiceSchema.success) {
    return {
      success: false,
      error: parsedServiceSchema.error,
    };
  }

  if (parsedServiceSchema.data.type === "CredentialRegistry") {
    const parsedServiceRegistrySchema =
      credentialRegistryServiceEndpointSchema.safeParse(
        parsedServiceSchema.data.serviceEndpoint,
      );

    if (!parsedServiceRegistrySchema.success) {
      return {
        success: false,
        error: parsedServiceRegistrySchema.error,
      };
    }
  }

  return { success: true };
}

export const addServiceSchema = baseParamSchema.merge(
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
    service: z.string().superRefine((val, ctx) => {
      const serviceValidation = isServiceDocument(val);
      if (!serviceValidation.success) {
        if (serviceValidation.error instanceof ZodError) {
          serviceValidation.error.errors.forEach((error) =>
            ctx.addIssue({
              ...error,
              path: [...error.path],
            }),
          );
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: serviceValidation.error,
          });
        }
      }
    }),
  }),
);

export type AddServiceSchema = z.infer<typeof addServiceSchema>;

export const requestAddServiceDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("addService"),
    params: z.array(addServiceSchema).min(1).max(1),
  }),
);
