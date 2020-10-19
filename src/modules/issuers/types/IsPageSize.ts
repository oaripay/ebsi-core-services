import { registerDecorator } from "class-validator";

export default function IsPageSize() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isPageSize",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          const num = parseInt(value, 10);
          return num > 0 && num <= 50;
        },

        defaultMessage() {
          return "PageSize must be between 1 and 50";
        },
      },
    });
  };
}
