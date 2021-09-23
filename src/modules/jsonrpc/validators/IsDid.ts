import { registerDecorator } from "class-validator";
import { isDid } from "../../../shared/utils/isDid";

export function IsDid() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          return isDid(value);
        },
      },
    });
  };
}

export default IsDid;
