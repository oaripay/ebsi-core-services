import {
  ValidateBy,
  type ValidationOptions,
  buildMessage,
} from "class-validator";
import { multibase } from "../utils/multibase.utils.js";
import { multihashDecode } from "../utils/multihash.utils.js";

export const IS_MULTIHASH_MULTIBASE64URL_ENCODED =
  "isMultihashMultibase64urlEncoded";

export function isMultihashMultibase64urlEncoded(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    multihashDecode(multibase.base64url.decode(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function IsMultihashMultibase64urlEncoded(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_MULTIHASH_MULTIBASE64URL_ENCODED,
      validator: {
        validate: (value) => isMultihashMultibase64urlEncoded(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be multihash encoded in multi-base64url`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
