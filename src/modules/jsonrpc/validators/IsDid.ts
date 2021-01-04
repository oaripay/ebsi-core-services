import { registerDecorator } from "class-validator";

export function IsDid() {
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
      },
    });
  };
}

export default { IsDid };
