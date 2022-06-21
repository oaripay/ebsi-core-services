import { validate as validateDid } from "@cef-ebsi/ebsi-did-resolver";
import {
  registerDecorator,
  buildMessage,
  ValidationOptions,
} from "class-validator";

export function IsDid(validationOptions?: ValidationOptions) {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          if (
            !(
              typeof value === "string" &&
              value.split(":").length >= 3 &&
              value.substring(0, 4) === "did:"
            )
          ) {
            return false;
          }

          // EBSI DID Validation
          const methodPrefix = "did:ebsi:";

          // Don't check method specific identifier if it's not an EBSI DID
          if (!value.startsWith(methodPrefix)) return true;

          try {
            validateDid(value);
            return true;
          } catch (e) {
            // Unable to decode multibase base58 string
            return false;
          }
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID string`,
          validationOptions
        ),
      },
    });
  };
}

export default IsDid;
