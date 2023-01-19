import {
  registerDecorator,
  buildMessage,
  ValidationOptions,
} from "class-validator";
import { EBSI_DID_METHOD_PREFIX, validate } from "@cef-ebsi/ebsi-did-resolver";
import { util } from "@cef-ebsi/key-did-resolver";

export function IsDid(validationOptions?: ValidationOptions) {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          if (!value || typeof value !== "string") return false;

          try {
            if (value.startsWith(EBSI_DID_METHOD_PREFIX)) {
              validate(value);
            } else {
              util.validateDid(value);
            }
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
