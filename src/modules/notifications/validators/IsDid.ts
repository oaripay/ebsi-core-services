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
          try {
            validate(value);
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
