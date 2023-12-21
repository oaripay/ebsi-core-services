import {
  isHexadecimal,
  ValidateBy,
  buildMessage,
  ValidationOptions,
} from "class-validator";
import { isDidV1 } from "@ebsiint-api/shared";

export const IS_HEXADECIMAL_DID = "isHexadecimalDid";

export function IsHexadecimalDidRule(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_DID,
      validator: {
        validate: (value) => {
          if (typeof value !== "string" || !isHexadecimal(value)) return false;

          // Must start with 0x
          if (!value.startsWith("0x")) return false;

          // Length must be even
          if (value.length % 2 !== 0) return false;

          const utf8Value = Buffer.from(value.substr(2), "hex").toString(
            "utf8",
          );

          // It must be a DID, i.e "did:xxx:xxx"
          return isDidV1(utf8Value).success;
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid DID v1 encoded in hexadecimal`,
        ),
      },
    },
    validationOptions,
  );
}

export default IsHexadecimalDidRule;
