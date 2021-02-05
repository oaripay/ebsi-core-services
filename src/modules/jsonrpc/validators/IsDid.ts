import { registerDecorator } from "class-validator";

export const IS_DID = "isDid";

export function IsDid() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: IS_DID,
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
      },
    });
  };
}
