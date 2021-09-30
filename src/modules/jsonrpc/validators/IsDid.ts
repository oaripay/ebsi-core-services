import { registerDecorator } from "class-validator";
import { isDid } from "../../../shared/utils/isDid";

export const IS_DID = "isDid";

export function IsDid() {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: IS_DID,
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
