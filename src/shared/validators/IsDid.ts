import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { multibase } from "../utils/multibase.utils";

const DID_VERSION = 1;
const DID_BYTE_LENGTH = 17;

export const IS_DID = "isDid";

export function isDid(value: string): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const idString = parts[2];
  try {
    const idBuffer = multibase.base58btc.decode(idString);
    if (idBuffer[0] !== DID_VERSION || idBuffer.length !== DID_BYTE_LENGTH)
      return false;
  } catch (error) {
    return false;
  }
  return true;
}

export function IsDid(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID,
      validator: {
        validate: (value) => isDid(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
