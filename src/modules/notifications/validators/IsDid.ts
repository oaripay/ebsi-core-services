import {
  registerDecorator,
  buildMessage,
  ValidationOptions,
} from "class-validator";
import { validate } from "@cef-ebsi/ebsi-did-resolver";

export function IsDid(validationOptions?: ValidationOptions) {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          if (
            typeof value !== "string" ||
            value.split(":").length < 3 ||
            value.substring(0, 4) !== "did:"
          ) {
            return false;
          }

          // Check if the EBSI DID is valid
          if (value.startsWith("did:ebsi:")) {
            try {
              validate(value);
              return true;
            } catch (e) {
              return false;
            }
          }

          return true;
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
