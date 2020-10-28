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
          return (
            typeof value === "string" &&
            value.split(":").length >= 3 &&
            value.substring(0, 4) === "did:"
          );
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
