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
          try {
            validateDid(value);
            return true;
          } catch (e) {
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
