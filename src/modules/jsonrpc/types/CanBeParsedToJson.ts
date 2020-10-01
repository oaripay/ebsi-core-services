import { registerDecorator } from "class-validator";

export default function CanBeParsedToJson() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "canBeParsedToJson",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown) {
          try {
            const bytes = Buffer.from((value as string).slice(2), "hex");
            JSON.parse(bytes.toString("utf8"));
            return true;
          } catch (error) {
            return false;
          }
        },
      },
    });
  };
}
