import { z } from "zod";
import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const IS_SERVICE_DOCUMENT = "isServiceDocument";

const CredentialRegistryServiceEndpoint = z.object({
  byId: z.string().optional(),
  byType: z.string().optional(),
});

const ServiceSchema = z.object({
  /**
   * ZOD does not have validations for URI, only URL
   * https://www.w3.org/TR/did-core/#services
   */
  id: z.string(),
  type: z.string().or(z.set(z.string().nonempty())),
  serviceEndpoint: z
    .string()
    .or(CredentialRegistryServiceEndpoint)
    .or(z.set(z.string().or(z.object({})))),
});

export function isServiceDocument(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  let documentService = null;
  try {
    documentService = JSON.parse(value);
  } catch (ex) {
    return false;
  }

  const parsedServiceSchema = ServiceSchema.safeParse(documentService);

  if (!parsedServiceSchema.success) {
    return false;
  }

  if (Array.isArray(parsedServiceSchema.data.id)) {
    const uniqueIds = new Set(parsedServiceSchema.data.id.map((item) => item));
    if (uniqueIds.size !== parsedServiceSchema.data.id.length) {
      throw new Error("Ids should be unique");
    }
  }

  if (parsedServiceSchema.data.type === "CredentialRegistry") {
    const parsedServiceRegistrySchema =
      CredentialRegistryServiceEndpoint.safeParse(
        parsedServiceSchema.data.serviceEndpoint
      );

    if (!parsedServiceRegistrySchema.success) {
      return false;
    }
  }

  return true;
}

export function IsServiceDocument(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_SERVICE_DOCUMENT,
      validator: {
        validate: (value) => isServiceDocument(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid JSON string with the fields id, type, serviceEndpoint`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
