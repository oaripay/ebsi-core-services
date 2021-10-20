import { registerDecorator, buildMessage } from "class-validator";

const allowedMethods = ["readContract", "sendProposal"];

export function IsValidMethod() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isValidMethod",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && allowedMethods.includes(value);
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid method`
        ),
      },
    });
  };
}

export default { IsValidMethod };
