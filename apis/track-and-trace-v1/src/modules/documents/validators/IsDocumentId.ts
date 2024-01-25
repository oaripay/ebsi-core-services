import {
  buildMessage,
  isHexadecimal,
  ValidateBy,
  ValidationOptions,
} from "class-validator";

export const IS_DOCUMENT_ID = "isDocumentId";

export const isDocumentId = (value: unknown) => {
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

export function IsDocumentId(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DOCUMENT_ID,
      validator: {
        validate: isDocumentId,
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid document ID (32 bytes encoded in hexadecimal and starting with 0x)`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
