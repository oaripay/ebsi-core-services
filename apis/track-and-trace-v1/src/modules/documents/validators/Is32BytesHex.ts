import {
  buildMessage,
  isHexadecimal,
  ValidateBy,
  ValidationOptions,
} from "class-validator";

export const IS_32_BYTES_HEX = "is32BytesHex";

export const is32BytesHex = (value: unknown) => {
  // Check if the value is an hexadecimal string starting with 0x
  if (
    typeof value !== "string" ||
    !value.startsWith("0x") ||
    !isHexadecimal(value)
  ) {
    return false;
  }

  // Check if the byte length is 32
  if (Buffer.from(value.slice(2), "hex").byteLength !== 32) {
    return false;
  }

  return true;
};

export function Is32BytesHex(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_32_BYTES_HEX,
      validator: {
        validate: is32BytesHex,
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be 32 bytes encoded in hexadecimal and start with 0x`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
